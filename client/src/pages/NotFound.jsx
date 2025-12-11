import { Link } from 'react-router-dom';
import '../App.css';

const NotFound = () => {
  return (
    <section className="not-found-section">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-message">Page Not Found</p>
        <p className="not-found-description">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="not-found-button">
          Go Home
        </Link>
      </div>
    </section>
  );
};

export default NotFound;

