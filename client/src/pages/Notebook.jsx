import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Notebook = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col overflow-x-hidden break-words">
      <div className="w-full flex-1 min-h-0 flex items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 p-6 text-slate-200">
        Your saved highlights will appear here
      </div>
    </div>
  );
};

export default Notebook;

