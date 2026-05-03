import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Copy, Trash2, Volume2 } from 'lucide-react';
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
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNote({ variables: { id } }).catch((err) =>
        console.error('Delete error:', err)
      );
    }
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
      <div className="flex flex-1 flex-col space-y-4 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
        <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4 text-slate-500 shadow-sm dark:border dark:border-white/5 dark:bg-slate-900 dark:text-slate-400 dark:shadow-none">
          Loading notes...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col space-y-4 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-red-600 shadow-sm dark:border dark:border-white/5 dark:bg-slate-900 dark:text-red-400 dark:shadow-none">
          Error loading notes
        </div>
      </div>
    );
  }

  const notes = data?.getNotes || [];
  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-1 flex-col space-y-4 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-slate-500 shadow-sm dark:border dark:border-white/5 dark:bg-slate-900 dark:text-slate-400 dark:shadow-none">
          Your saved highlights will appear here
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full space-y-4 overflow-x-hidden break-words">
      {notes.map((note) => {
        const dateLabel = note?.createdAt
          ? new Date(note.createdAt).toLocaleDateString()
          : '';
        const hasSource = Boolean(note?.sourceUrl);

        return (
          <div
            key={note.id}
            className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border dark:border-white/5 dark:bg-slate-900 dark:shadow-none dark:hover:border-white/10 dark:hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Note
              </span>
              <div className="text-xs text-slate-500 shrink-0">{dateLabel}</div>
            </div>

            <div className="whitespace-pre-wrap break-words text-base font-medium text-slate-900 dark:text-slate-200">
              {note.text}
            </div>

            {hasSource ? (
              <a
                href={note.sourceUrl}
                className="break-all text-sm text-slate-600 hover:text-emerald-600 hover:underline dark:text-slate-400 dark:hover:text-emerald-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                {note.sourceUrl}
              </a>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400"> </div>
            )}

            <div className="mt-2 flex justify-end gap-2 border-t border-slate-100 pt-2 dark:border-white/5">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText((note.text ?? '').toString()).catch(() => {})}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                title="Copy"
                aria-label="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => speakText(note.text, 'en')}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                title="Speak"
                aria-label="Speak"
                disabled={!note?.text?.trim()}
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
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
    </div>
  );
};

export default Notebook;

