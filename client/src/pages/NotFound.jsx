import { Link } from 'react-router-dom';
import '../App.css';
import { useLanguage } from '../context/LanguageContext';

const NotFound = () => {
  const { t } = useLanguage();

  return (
    <section className="not-found-section">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-message">{t('notfound.title')}</p>
        <p className="not-found-description">{t('notfound.description')}</p>
        <Link to="/" className="not-found-button">
          {t('notfound.home')}
        </Link>
      </div>
    </section>
  );
};

export default NotFound;
