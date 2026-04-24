import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { TRANSLATE_TEXT } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { speakText, warmupSpeechSynthesis } from '@/lib/speakText';
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

  useEffect(() => {
    warmupSpeechSynthesis();
    const synth = window.speechSynthesis;
    if (!synth) return undefined;
    const onVoices = () => warmupSpeechSynthesis();
    synth.addEventListener('voiceschanged', onVoices);
    return () => synth.removeEventListener('voiceschanged', onVoices);
  }, []);

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

  const textareaClass =
    'min-h-0 flex-1 w-full resize-none rounded-b-xl border-0 bg-slate-950/50 p-4 pb-12 text-sm text-slate-200 shadow-inner outline-none ring-0 placeholder:text-slate-500 focus-visible:ring-0 break-words overflow-x-hidden overflow-y-auto';

  const inputSpeechLang =
    sourceLang === 'auto' ? 'en-US' : getSpeechLanguage(sourceLang);
  const outputSpeechLang = getSpeechLanguage(targetLang);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden break-words p-4">
      <form
        onSubmit={handleTranslate}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
      >
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg">
          <div className="shrink-0 border-b border-slate-800 px-3 py-2">
            <Label htmlFor="input-text" className="text-xs font-medium text-slate-400">
              Input
            </Label>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="relative flex min-h-0 flex-1 flex-col">
              <Textarea
                id="input-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type text…"
                className={textareaClass}
              />
              <button
                type="button"
                onClick={() => speakText(text, inputSpeechLang)}
                className="absolute bottom-3 right-3 z-10 rounded-full bg-slate-800/80 p-2 text-slate-400 shadow-md backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                title="Listen to text"
                aria-label="Listen to input text"
                disabled={!text.trim()}
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 p-2">
          <div className="min-w-[7rem] flex-1">
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger
                id="source-lang"
                className="h-9 w-full border-slate-600/80 bg-slate-950/40 text-sm text-slate-200 shadow-none focus:ring-emerald-500/40"
              >
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent className="border border-slate-700 bg-slate-900">
                {LANGUAGES_WITH_AUTO.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="text-slate-200 focus:bg-slate-800"
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-600/80 bg-slate-950/40 text-slate-200 transition-colors hover:bg-slate-800"
            aria-label="Swap languages"
            title="Swap languages"
          >
            ⇄
          </button>

          <div className="min-w-[7rem] flex-1">
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger
                id="target-lang"
                className="h-9 w-full border-slate-600/80 bg-slate-950/40 text-sm text-slate-200 shadow-none focus:ring-emerald-500/40"
              >
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent className="border border-slate-700 bg-slate-900">
                {LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="text-slate-200 focus:bg-slate-800"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '…' : 'Translate'}
          </button>
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg">
          <div className="shrink-0 border-b border-slate-800 px-3 py-2">
            <Label htmlFor="output-text" className="text-xs font-medium text-slate-400">
              Output
            </Label>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="relative flex min-h-0 flex-1 flex-col">
              <Textarea
                id="output-text"
                value={translatedText}
                readOnly
                placeholder="Translation…"
                className={`${textareaClass} cursor-default text-slate-200`}
              />
              <button
                type="button"
                onClick={() => speakText(translatedText, outputSpeechLang)}
                className="absolute bottom-3 right-3 z-10 rounded-full bg-slate-800/80 p-2 text-slate-400 shadow-md backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                title="Listen to text"
                aria-label="Listen to translated text"
                disabled={!translatedText.trim()}
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {error && (
          <p className="shrink-0 text-xs leading-snug text-red-400 break-words">{error.message}</p>
        )}
      </form>
    </div>
  );
};

export default Translate;

