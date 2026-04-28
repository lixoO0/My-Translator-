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
      <div className="flex flex-1 flex-col overflow-y-auto bg-slate-950 p-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-400 animate-pulse">
          Loading notes...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto bg-slate-950 p-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-red-400">
          Error loading notes
        </div>
      </div>
    );
  }

  const notes = data?.getNotes || [];
  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto bg-slate-950 p-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-400">
          Your saved highlights will appear here
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-y-auto bg-slate-950 p-4">
      <div className="w-full space-y-4 overflow-x-hidden break-words">
      {notes.map((note) => {
        const dateLabel = note?.createdAt
          ? new Date(note.createdAt).toLocaleDateString()
          : '';
        const hasSource = Boolean(note?.sourceUrl);

        return (
          <div
            key={note.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-block px-2 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-semibold">
                Note
              </span>
              <div className="text-xs text-slate-500 shrink-0">{dateLabel}</div>
            </div>

            <div className="text-slate-200 text-base font-medium whitespace-pre-wrap break-words">
              {note.text}
            </div>

            {hasSource ? (
              <a
                href={note.sourceUrl}
                className="text-slate-400 text-sm hover:text-emerald-400 hover:underline break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {note.sourceUrl}
              </a>
            ) : (
              <div className="text-slate-400 text-sm"> </div>
            )}

            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-800/50">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText((note.text ?? '').toString()).catch(() => {})}
                className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors"
                title="Copy"
                aria-label="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => speakText(note.text, 'en')}
                className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors"
                title="Speak"
                aria-label="Speak"
                disabled={!note?.text?.trim()}
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
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
    </div>
  );
};

export default Notebook;

