import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HistoryModal from '../components/HistoryModal';

const History = () => {
  // Автоматично відкриваємо модалку при відвідуванні сторінки
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <HistoryModal
        isOpen={isHistoryOpen}
        variant="page"
        onClose={() => {
          setIsHistoryOpen(false);
          navigate('/translate');
        }}
      />
    </div>
  );
};

export default History;

