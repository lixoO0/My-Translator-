import { useAuth } from '../context/AuthContext';

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

export default Home;

