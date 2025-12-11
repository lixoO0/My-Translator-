import { useState } from 'react';
import HistoryModal from '../components/HistoryModal';

const History = () => {
  // Автоматично відкриваємо модалку при відвідуванні сторінки
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  return (
    <>
      <HistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
      />
      <section className="home">
        <h1>Translation History</h1>
        <p>View your translation history in the modal above.</p>
      </section>
    </>
  );
};

export default History;

