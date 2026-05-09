import { Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './Navbar';
import HistoryModal from './HistoryModal';

const Layout = () => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="pait-layout-root relative flex h-screen w-full flex-col overflow-hidden">
      <Navbar onOpenHistory={() => setIsHistoryOpen(true)} />
      <main className="pait-main">
        <div key={location.pathname} className="pait-page">
          <Outlet />
        </div>
      </main>

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </div>
  );
};

export default Layout;

