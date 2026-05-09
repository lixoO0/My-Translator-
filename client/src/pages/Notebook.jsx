/**
 * Notebook entries are loaded from the server (GraphQL); there is no separate draft buffer here.
 * Tool workspaces that need offline/tab-switch persistence use useLocalStorage (Translate, Summarize).
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Copy, Square, Trash2, Volume2 } from 'lucide-react';
import { speakText, warmupSpeechSynthesis } from '@/lib/speakText';

const GET_NOTES = gql`
  query GetNotes {
    getNotes {
      id
      text
      sourceUrl
      createdAt
    }
  }
`;

const DELETE_NOTE = gql`
  mutation DeleteNote($id: ID!) {
    deleteNote(id: $id)
  }
`;

export const Notebook = () => {
  const { t } = useLanguage();
  const [ttsNoteId, setTtsNoteId] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    warmupSpeechSynthesis();
  }, []);

  const { loading, error, data, refetch } = useQuery(GET_NOTES, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });
  const [deleteNote] = useMutation(DELETE_NOTE, {
    refetchQueries: [{ query: GET_NOTES }],
  });

  const handleDelete = (id) => {
    if (window.confirm(t('notebook.confirm_delete'))) {
      deleteNote({ variables: { id } }).catch((err) =>
        console.error('Delete error:', err)
      );
    }
  };

  const handleSpeakNote = (note) => {
    const id = note.id;
    const utterance = (note.text ?? '').trim();
    if (!utterance || typeof window === 'undefined' || !window.speechSynthesis) return;

    if (window.speechSynthesis.speaking && ttsNoteId === id) {
      window.speechSynthesis.cancel();
      setTtsNoteId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setTtsNoteId(null);

    speakText(utterance, 'en', {
      onStart: () => setTtsNoteId(id),
      onEnd: () => setTtsNoteId(null),
      onError: () => setTtsNoteId(null),
    });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const handleMessage = (message) => {
      if (message?.action === 'NOTEBOOK_UPDATED') {
        refetch?.().catch(() => {});
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }

    return undefined;
  }, [refetch]);

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="pait-list-screen">
        <div className="pait-empty-card animate-pulse">{t('notebook.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pait-list-screen">
        <div className="pait-alert pait-alert--error">{t('notebook.error')}</div>
      </div>
    );
  }

  const notes = data?.getNotes || [];
  if (!notes || notes.length === 0) {
    return (
      <div className="pait-list-screen">
        <div className="pait-empty-card">{t('notebook.empty')}</div>
      </div>
    );
  }

  return (
    <div className="pait-list-screen">
      <div className="w-full space-y-4 overflow-x-hidden break-words">
        {notes.map((note) => {
          const dateLabel = note?.createdAt
            ? new Date(note.createdAt).toLocaleDateString()
            : '';
          const hasSource = Boolean(note?.sourceUrl);

          return (
            <div key={note.id} className="pait-note-card">
              <div className="flex items-start justify-between gap-3">
                <span className="pait-note-badge">{t('notebook.note')}</span>
                <div className="pait-note-meta shrink-0">{dateLabel}</div>
              </div>

              <div className="pait-note-body">{note.text}</div>

              {hasSource ? (
                <a
                  href={note.sourceUrl}
                  className="pait-note-link hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {note.sourceUrl}
                </a>
              ) : (
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {' '}
                </div>
              )}

              <div className="pait-note-actions">
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText((note.text ?? '').toString()).catch(() => {})
                  }
                  className="pait-note-icon-btn"
                  title={t('notebook.copy')}
                  aria-label={t('notebook.copy')}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeakNote(note)}
                  className={`pait-note-icon-btn ${ttsNoteId === note.id ? 'pait-tts-playing' : ''}`}
                  title={ttsNoteId === note.id ? t('translate.stop') : t('notebook.speak')}
                  aria-label={ttsNoteId === note.id ? t('translate.stop_speech') : t('notebook.speak')}
                  disabled={!note?.text?.trim()}
                >
                  {ttsNoteId === note.id ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="pait-note-icon-btn"
                  title={t('notebook.delete')}
                  aria-label={t('notebook.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notebook;
