import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

const Placeholder = ({ title }) => (
  <section className="placeholder">
    <h1>{title}</h1>
    <p>UI goes here.</p>
  </section>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder title="Dashboard" />} />
      <Route path="/login" element={<Placeholder title="Login" />} />
      <Route path="/register" element={<Placeholder title="Register" />} />
      <Route path="/history" element={<Placeholder title="History" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
