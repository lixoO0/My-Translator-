import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Translate from './pages/Translate';

const Home = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <section className="home">
      <h1>Personal AI Translator</h1>
      {isAuthenticated ? (
        <p>Welcome back, {user?.username}! Your dashboard will appear here.</p>
      ) : (
        <p>Please log in or create an account to get started.</p>
      )}
    </section>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Navbar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/translate" element={<Translate />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
