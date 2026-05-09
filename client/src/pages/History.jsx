import { useEffect, useState } from 'react';
import HistoryModal from '../components/HistoryModal';

const History = () => {
  const [refreshTick, setRefreshTick] = useState(0);

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
    <div className="pait-list-screen flex h-full w-full flex-1 flex-col">
      <HistoryModal isOpen onClose={() => {}} refreshTick={refreshTick} />
    </div>
  );
};

export default History;

