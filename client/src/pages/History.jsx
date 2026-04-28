import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HistoryModal from '../components/HistoryModal';

const History = () => {
  // Автоматично відкриваємо модалку при відвідуванні сторінки
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (message) => {
      if (message?.action === 'HISTORY_UPDATED') {
        setRefreshTick((tick) => tick + 1);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }

    return undefined;
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-slate-950 p-4 space-y-4">
      <HistoryModal
        isOpen={isHistoryOpen}
        variant="page"
        refreshTick={refreshTick}
        onClose={() => {
          setIsHistoryOpen(false);
          navigate('/translate');
        }}
      />
    </div>
  );
};

export default History;

