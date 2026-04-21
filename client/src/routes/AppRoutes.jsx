import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Translate from '../pages/Translate';
import Summarize from '../pages/Summarize';
import History from '../pages/History';
import Notebook from '../pages/Notebook';
import NotFound from '../pages/NotFound';
import { useAuth } from '../context/AuthContext';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return children;
  };

  const GuestRoute = ({ children }) => {
    if (isAuthenticated) {
      return <Navigate to="/translate" replace />;
    }
    return children;
  };

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/translate" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        <Route
          path="/translate"
          element={
            <ProtectedRoute>
              <Translate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/summarize"
          element={
            <ProtectedRoute>
              <Summarize />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notebook"
          element={
            <ProtectedRoute>
              <Notebook />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;

