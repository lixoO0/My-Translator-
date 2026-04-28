import { useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_HISTORY } from '../graphql/queries';
import { DELETE_HISTORY_ITEM } from '../graphql/mutations';
import { Copy, Trash2, Volume2, X } from 'lucide-react';
import { speakText, warmupSpeechSynthesis } from '@/lib/speakText';

export const HistoryModal = ({ isOpen = false, onClose, refreshTick = 0 }) => {
  if (!isOpen) return null;

  const { data, loading, error, refetch } = useQuery(GET_HISTORY, {
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

  useEffect(() => {
    warmupSpeechSynthesis();
  }, []);

  useEffect(() => {
    if (!refreshTick) return;
    refetch?.().catch(() => {});
  }, [refreshTick, refetch]);

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

  const getMetaBadge = (item) => {
    const from = item?.metaData?.sourceLang || (item?.actionType === 'TRANSLATE' ? 'auto' : '');
    const to = item?.metaData?.targetLang || '';

    if (item?.actionType === 'TRANSLATE') {
      return `${from} → ${to || '—'}`;
    }

    if (item?.actionType === 'SUMMARIZE') {
      const length = item?.metaData?.summaryLength ? ` • ${item.metaData.summaryLength}` : '';
      return `${to || 'auto'}${length}`;
    }

    return '';
  };

  const copyToClipboard = async (value) => {
    try {
      await navigator.clipboard.writeText((value ?? '').toString());
    } catch (copyError) {
      console.error('Copy failed:', copyError);
    }
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

  const bodyContent = (
    <div className="space-y-4">
      {loading && (
        <div className="flex items-center justify-center min-h-[40vh] text-slate-500 animate-pulse">
          Loading history...
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center min-h-[40vh] text-slate-500">
          Failed to load history. Please try again.
        </div>
      )}

      {!loading && !error && data && (
        <>
          {data.history.length === 0 ? (
            <div className="flex items-center justify-center min-h-[40vh] text-slate-500">
              No history yet.
            </div>
          ) : (
            <div className="space-y-4">
              {data.history.map((item) => {
                const badgeText = getMetaBadge(item);
                const dateLabel = item?.createdAt ? formatDate(item.createdAt) : '';
                const outputLang = item?.metaData?.targetLang || 'uk';

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="inline-block px-2 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-semibold">
                          {item.actionType}
                        </span>
                        {badgeText ? (
                          <span className="inline-block px-2 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-semibold">
                            {badgeText}
                          </span>
                        ) : null}
                      </div>

                      <div className="text-xs text-slate-500 shrink-0">{dateLabel}</div>
                    </div>

                    <div className="text-slate-400 text-sm whitespace-pre-wrap break-words">
                      {truncateText(item.inputContent, 220)}
                    </div>

                    <div className="text-slate-200 text-base font-medium whitespace-pre-wrap break-words">
                      {truncateText(item.outputResult, 320)}
                    </div>

                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-800/50">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.outputResult)}
                        className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors"
                        title="Copy"
                        aria-label="Copy"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => speakText(item.outputResult, outputLang)}
                        className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors"
                        title="Speak"
                        aria-label="Speak"
                        disabled={!item?.outputResult?.trim()}
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col p-4 overflow-y-auto">
      <div className="shrink-0 flex items-center justify-between gap-3 pb-4">
        <h2 className="text-slate-200 font-semibold">History</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-slate-900 rounded-md transition-colors"
          aria-label="Close history"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {bodyContent}
    </div>
  );
};

export default HistoryModal;

