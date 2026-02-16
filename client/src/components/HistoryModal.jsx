import { useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { GET_HISTORY } from '../graphql/queries';
import { DELETE_HISTORY_ITEM } from '../graphql/mutations';

export const HistoryModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_HISTORY, {
    skip: !isOpen, // Не виконуємо запит, якщо модалка закрита
    fetchPolicy: 'network-only', // Завжди отримуємо свіжі дані
  });
  const [deleteItem] = useMutation(DELETE_HISTORY_ITEM, {
    update(cache, { data: mutationData }) {
      const deletedId = mutationData?.deleteHistoryItem;
      if (!deletedId) return;

      cache.updateQuery({ query: GET_HISTORY }, (existing) => {
        if (!existing?.history) return existing;
        return {
          history: existing.history.filter((item) => item.id !== deletedId),
        };
      });
    },
    refetchQueries: [{ query: GET_HISTORY }],
    awaitRefetchQueries: true,
  });

  // Блокуємо прокрутку body, коли modal відкритий
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup: повертаємо прокрутку при розмонтуванні
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleContinue = (item) => {
    const dataToRestore = {
      type: item.actionType,
      input: item.inputContent || '',
      output: item.outputResult || '',
      sourceLang: item.metaData?.sourceLang || 'auto',
      targetLang: item.metaData?.targetLang || 'English',
    };

    localStorage.setItem('restoreSession', JSON.stringify(dataToRestore));
    onClose();

    if (item.actionType === 'SUMMARIZE') {
      navigate('/summarize');
    } else {
      navigate('/translate');
    }
  };

  const handleDelete = async (itemId) => {
    try {
      await deleteItem({
        variables: { id: itemId },
        optimisticResponse: { deleteHistoryItem: itemId },
      });
    } catch (deleteError) {
      console.error('Failed to delete history item:', deleteError);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Translation History</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="history-loading">Loading...</div>
          )}

          {error && (
            <div className="history-error">
              Error: {error.message}
            </div>
          )}

          {!loading && !error && data && (
            <>
              {data.history.length === 0 ? (
                <div className="history-empty">
                  No translation history yet. Start translating to see your history here!
                </div>
              ) : (
                <div className="history-list">
                  {data.history.map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-item-header">
                        <span className="history-item-type">{item.actionType}</span>
                        <span className="history-item-date">{formatDate(item.createdAt)}</span>
                      </div>
                      <div className="history-item-content">
                        <div className="history-item-input">
                          <strong>Input:</strong>
                          <p>{truncateText(item.inputContent)}</p>
                        </div>
                        <div className="history-item-output">
                          <strong>Output:</strong>
                          <p>{truncateText(item.outputResult)}</p>
                        </div>
                        <div className="history-item-actions">
                          <button
                            type="button"
                            className="history-action-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleContinue(item);
                            }}
                          >
                            Open / Continue
                          </button>
                          <button
                            type="button"
                            className="history-action-btn history-action-delete"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(item.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                        {item.metaData && (item.metaData.sourceLang || item.metaData.targetLang) && (
                          <div className="history-item-meta">
                            {item.metaData.sourceLang && item.metaData.sourceLang !== 'auto' && (
                              <span>From: {item.metaData.sourceLang}</span>
                            )}
                            {item.metaData.targetLang && (
                              <span>To: {item.metaData.targetLang}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;

