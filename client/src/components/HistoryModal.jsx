import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Copy, MoreHorizontal } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { GET_HISTORY } from '../graphql/queries';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const HistoryModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_HISTORY, {
    skip: !isOpen, // Не виконуємо запит, якщо модалка закрита
    fetchPolicy: 'network-only', // Завжди отримуємо свіжі дані
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
    const historyType = item.type || item.actionType;

    const dataToRestore = {
      type: historyType,
      input:
        item.originalText ||
        item.text ||
        item.sourceText ||
        item.input ||
        item.inputContent ||
        '',
      output:
        item.resultText ||
        item.translation ||
        item.translatedText ||
        item.output ||
        item.outputResult ||
        '',
      sourceLang: item.sourceLanguage || item.sourceLang || item.metaData?.sourceLang || 'auto',
      targetLang: item.targetLanguage || item.targetLang || item.metaData?.targetLang || 'en',
    };

    localStorage.setItem('restoreSession', JSON.stringify(dataToRestore));
    onClose();

    if (historyType === 'TRANSLATION') {
      navigate('/');
    } else if (historyType === 'SUMMARY') {
      navigate('/summarize');
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
                      <div className="history-item-header flex items-center justify-between gap-3">
                        <span className="history-item-type">{item.actionType}</span>
                        <div className="flex items-center gap-2">
                          <span className="history-item-date">{formatDate(item.createdAt)}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(event) => event.stopPropagation()}
                                aria-label="Open history actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleContinue(item);
                                }}
                              >
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Open / Continue
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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

