import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './Navbar';
import HistoryModal from './HistoryModal';

const Layout = () => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
      <Navbar onOpenHistory={() => setIsHistoryOpen(true)} />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </div>
  );
};

export default Layout;

