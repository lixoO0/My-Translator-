import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';

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

  const { loading, error, data } = useQuery(GET_NOTES, {
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

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col overflow-x-hidden break-words">
        <div className="w-full flex-1 min-h-0 flex items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 p-6 text-slate-200">
          Loading notes...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col overflow-x-hidden break-words">
        <div className="w-full flex-1 min-h-0 flex items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 p-6 text-slate-200">
          Error loading notes
        </div>
      </div>
    );
  }

  const notes = data?.getNotes || [];
  if (!notes || notes.length === 0) {
    return (
      <div className="w-full h-full flex flex-col overflow-x-hidden break-words">
        <div className="w-full flex-1 min-h-0 flex items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 p-6 text-slate-200">
          Your saved highlights will appear here
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-3 overflow-y-auto pr-2 overflow-x-hidden break-words">
      {notes.map((note) => {
        const dateLabel = note?.createdAt
          ? new Date(note.createdAt).toLocaleDateString()
          : '';
        const hasSource = Boolean(note?.sourceUrl);

        return (
          <div
            key={note.id}
            className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-sm"
          >
            <div className="text-sm text-slate-200 whitespace-pre-wrap break-words">
              📝 {note.text}
            </div>

            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700">
              <div className="text-xs text-slate-400">{dateLabel}</div>
              <div className="flex gap-3 items-center">
                {hasSource && (
                  <a
                    href={note.sourceUrl}
                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🔗 Source
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                  title="Delete note"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Notebook;

