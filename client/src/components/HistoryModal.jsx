import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_HISTORY } from '../graphql/queries';
import { DELETE_HISTORY_ITEM } from '../graphql/mutations';
import { Copy, Square, Trash2, Volume2, X } from 'lucide-react';
import { speakText, warmupSpeechSynthesis } from '@/lib/speakText';
import { useLanguage } from '../context/LanguageContext';

export const HistoryModal = ({ isOpen = false, onClose, refreshTick = 0 }) => {
  const { language, t } = useLanguage();
  const [ttsPlayingId, setTtsPlayingId] = useState(null);

  const { data, loading, error, refetch } = useQuery(GET_HISTORY, {
    fetchPolicy: 'network-only',
    skip: !isOpen,
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
    if (!refreshTick || !isOpen) return;
    refetch?.().catch(() => {});
  }, [refreshTick, refetch, isOpen]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const locale = language === 'uk' ? 'uk-UA' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
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

  const handleSpeakItem = (item) => {
    const id = item.id;
    const lang = item?.metaData?.targetLang || 'uk';
    const raw = item.outputResult;
    const utterance = (raw ?? '').trim();
    if (!utterance || typeof window === 'undefined' || !window.speechSynthesis) return;

    if (window.speechSynthesis.speaking && ttsPlayingId === id) {
      window.speechSynthesis.cancel();
      setTtsPlayingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setTtsPlayingId(null);

    speakText(utterance, lang, {
      onStart: () => setTtsPlayingId(id),
      onEnd: () => setTtsPlayingId(null),
      onError: () => setTtsPlayingId(null),
    });
  };

  const bodyContent = (
    <div className="pait-history-stack">
      {loading && (
        <div className="pait-history-placeholder animate-pulse">{t('history.loading')}</div>
      )}

      {error && (
        <div className="pait-history-placeholder">{t('history.error')}</div>
      )}

      {!loading && !error && data && (
        <>
          {data.history.length === 0 ? (
            <div className="pait-history-placeholder">{t('history.empty')}</div>
          ) : (
            data.history.map((item) => {
              const badgeText = getMetaBadge(item);
              const dateLabel = item?.createdAt ? formatDate(item.createdAt) : '';

              return (
                <div key={item.id} className="pait-history-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="pait-history-tags">
                      <span className="pait-history-tag">{item.actionType}</span>
                      {badgeText ? (
                        <span className="pait-history-tag">{badgeText}</span>
                      ) : null}
                    </div>
                    <div className="pait-history-date">{dateLabel}</div>
                  </div>

                  <p className="pait-history-input-preview">
                    {truncateText(item.inputContent, 220)}
                  </p>

                  <p className="pait-history-output">
                    {truncateText(item.outputResult, 320)}
                  </p>

                  <div className="pait-history-actions">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.outputResult)}
                      className="pait-history-icon-btn"
                      title={t('history.copy')}
                      aria-label={t('history.copy')}
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSpeakItem(item)}
                      className={`pait-history-icon-btn ${ttsPlayingId === item.id ? 'pait-tts-playing' : ''}`}
                      title={ttsPlayingId === item.id ? t('translate.stop') : t('history.speak')}
                      aria-label={ttsPlayingId === item.id ? t('translate.stop_speech') : t('history.speak')}
                      disabled={!item?.outputResult?.trim()}
                    >
                      {ttsPlayingId === item.id ? (
                        <Square className="h-4 w-4 fill-current" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="pait-history-icon-btn"
                      title={t('history.delete')}
                      aria-label={t('history.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="pait-history-root absolute inset-0 z-50 flex flex-col">
      <div className="pait-history-header">
        <h2 className="pait-history-title">{t('history.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          className="pait-history-close"
          aria-label={t('history.close')}
          title={t('history.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {bodyContent}
    </div>
  );
};

export default HistoryModal;
