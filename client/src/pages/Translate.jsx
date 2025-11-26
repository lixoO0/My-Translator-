import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { TRANSLATE_TEXT } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Ukrainian', label: 'Ukrainian' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Polish', label: 'Polish' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Turkish', label: 'Turkish' },
];

const LANGUAGES_WITH_AUTO = [
  { value: 'auto', label: 'Auto-detect' },
  ...LANGUAGES,
];

export const Translate = () => {
  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('English');
  const [translatedText, setTranslatedText] = useState('');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [translate, { loading, error }] = useMutation(TRANSLATE_TEXT, {
    onCompleted: (data) => {
      setTranslatedText(data.translate.outputResult);
    },
  });

  // Перевірка автентифікації
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const handleTranslate = async (e) => {
    e.preventDefault();
    
    if (!text.trim()) {
      return;
    }

    try {
      await translate({
        variables: {
          text: text.trim(),
          sourceLang: sourceLang === 'auto' ? null : sourceLang,
          targetLang,
        },
      });
    } catch (err) {
      console.error('Translation error:', err);
    }
  };

  return (
    <section className="translate-section">
      <div className="translate-card">
        <h1 className="translate-title">Translator</h1>

        <form className="translate-form" onSubmit={handleTranslate}>
          <div className="translate-controls">
            <label className="translate-label">
              From (Source Language)
              <select
                className="translate-select"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
              >
                {LANGUAGES_WITH_AUTO.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="translate-label">
              To (Target Language)
              <select
                className="translate-select"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="translate-button"
              type="submit"
              disabled={loading || !text.trim()}
            >
              {loading ? 'Translating...' : 'Translate'}
            </button>
          </div>

          <div className="translate-textareas">
            <div className="translate-textarea-wrapper">
              <label className="translate-textarea-label">Input Text</label>
              <textarea
                className="translate-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to translate..."
                rows={12}
              />
            </div>

            <div className="translate-textarea-wrapper">
              <label className="translate-textarea-label">Translated Text</label>
              <textarea
                className="translate-textarea translate-textarea-output"
                value={translatedText}
                readOnly
                placeholder="Translation will appear here..."
                rows={12}
              />
            </div>
          </div>

          {error && <p className="translate-error">{error.message}</p>}
        </form>
      </div>
    </section>
  );
};

export default Translate;

