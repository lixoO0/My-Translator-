import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { TRANSLATE_TEXT } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import SpeechButton from '@/components/ui/SpeechButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Language pickers use Radix <Select> (custom dropdown), not native <select>/<option>.
// Dark styling for list items lives on <SelectItem /> + <SelectContent />.

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Ukrainian', label: 'Ukrainian' },
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

const SPEECH_LANGUAGE_MAP = {
  English: 'en-US',
  Ukrainian: 'uk-UA',
  Spanish: 'es-ES',
  French: 'fr-FR',
  German: 'de-DE',
  Italian: 'it-IT',
  Portuguese: 'pt-PT',
  Polish: 'pl-PL',
  Japanese: 'ja-JP',
  Chinese: 'zh-CN',
  Korean: 'ko-KR',
  Arabic: 'ar-SA',
  Turkish: 'tr-TR',
};

const getSpeechLanguage = (language) => SPEECH_LANGUAGE_MAP[language] || language;

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

  useEffect(() => {
    const savedSession = localStorage.getItem('restoreSession');
    if (!savedSession) return;

    try {
      const parsed = JSON.parse(savedSession);
      if (parsed?.type === 'TRANSLATE') {
        setText(parsed.input || '');
        setTranslatedText(parsed.output || '');
        setSourceLang(parsed.sourceLang || 'auto');
        setTargetLang(parsed.targetLang || 'English');
        localStorage.removeItem('restoreSession');
      }
    } catch (restoreError) {
      console.error('Failed to restore session data', restoreError);
    }
  }, []);

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

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') {
      // Auto-detect isn't a concrete language to swap with.
      // Promote current target to source and reset target to a sensible default.
      setSourceLang(targetLang);
      setTargetLang('English');
      setText(translatedText || text);
      setTranslatedText('');
      return;
    }

    const nextSource = targetLang;
    const nextTarget = sourceLang;
    setSourceLang(nextSource);
    setTargetLang(nextTarget);
    setText(translatedText || text);
    setTranslatedText('');
  };

  return (
    <div className="w-full h-full flex flex-col overflow-x-hidden break-words">
      <form
        onSubmit={handleTranslate}
        className="w-full flex-1 min-h-0 flex flex-col gap-2 overflow-hidden"
      >
        {/* Top: Input */}
        <div className="flex-1 basis-0 min-h-0 flex flex-col gap-1">
          <Label htmlFor="input-text" className="text-slate-300 text-xs">
            Input
          </Label>
          <div className="relative flex-1 min-h-0">
            <Textarea
              id="input-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type text…"
              className="h-full min-h-0 resize-none overflow-y-auto rounded-md border border-slate-700 bg-slate-800/60 p-2 pr-9 text-sm text-slate-100 placeholder:text-slate-400 focus:border-green-500 break-words overflow-x-hidden"
            />
            <SpeechButton
              text={text}
              language={sourceLang === 'auto' ? undefined : getSpeechLanguage(sourceLang)}
              className="absolute bottom-2 right-2"
              ariaLabel="Speak input text"
            />
          </div>
        </div>

        {/* Middle: Control bar */}
        <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1">
          <div className="flex-1 min-w-0">
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger
                id="source-lang"
                className="h-8 w-full bg-transparent bg-slate-800 text-slate-100 border-slate-700 text-sm px-2 focus:border-green-500"
              >
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {LANGUAGES_WITH_AUTO.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="bg-slate-800 text-slate-100 focus:bg-slate-700"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={handleSwapLanguages}
            className="h-8 w-8 shrink-0 rounded-md border border-slate-700 bg-slate-800/60 text-slate-100 text-sm hover:bg-slate-800"
            aria-label="Swap languages"
            title="Swap languages"
          >
            ⇄
          </button>

          <div className="flex-1 min-w-0">
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger
                id="target-lang"
                className="h-8 w-full bg-transparent bg-slate-800 text-slate-100 border-slate-700 text-sm px-2 focus:border-green-500"
              >
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="bg-slate-800 text-slate-100 focus:bg-slate-700"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={loading || !text.trim()}
            className="h-8 shrink-0 rounded-md bg-green-600 px-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '…' : 'Translate'}
          </Button>
        </div>

        {/* Bottom: Output */}
        <div className="flex-1 basis-0 min-h-0 flex flex-col gap-1">
          <Label htmlFor="output-text" className="text-slate-300 text-xs">
            Output
          </Label>
          <div className="relative flex-1 min-h-0">
            <Textarea
              id="output-text"
              value={translatedText}
              readOnly
              placeholder="Translation…"
              className="h-full min-h-0 resize-none overflow-y-auto rounded-md border border-slate-700 bg-slate-800/40 p-2 pr-9 text-sm text-slate-100 placeholder:text-slate-400 cursor-default break-words overflow-x-hidden"
            />
            <SpeechButton
              text={translatedText}
              language={getSpeechLanguage(targetLang)}
              className="absolute bottom-2 right-2"
              ariaLabel="Speak translated text"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-xs leading-snug break-words">
            {error.message}
          </p>
        )}
      </form>
    </div>
  );
};

export default Translate;

