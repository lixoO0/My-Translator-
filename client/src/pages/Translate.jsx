import { useState, useEffect, useRef } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const translationCache = useRef(new Map());
  const activeRequestId = useRef(0);

  const [translate] = useMutation(TRANSLATE_TEXT);

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

  // Live translation with cache + debounce (prevents server overload while typing).
  useEffect(() => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      activeRequestId.current += 1; // invalidate any in-flight result
      setIsLoading(false);
      setTranslatedText('');
      return;
    }

    // Unique cache key: text + source + target language
    const cacheKey = `${trimmedText}_${sourceLang}_${targetLang}`;

    // Instant hit from cache (especially useful when user deletes/retypes)
    if (translationCache.current.has(cacheKey)) {
      setIsLoading(false);
      setTranslatedText(translationCache.current.get(cacheKey));
      return;
    }

    setIsLoading(true);
    const requestId = (activeRequestId.current += 1);

    const timer = setTimeout(async () => {
      try {
        const { data } = await translate({
          variables: {
            text: trimmedText,
            sourceLang: sourceLang === 'auto' ? null : sourceLang,
            targetLang,
          },
        });

        const result = data?.translate?.outputResult ?? '';

        // Ignore stale responses
        if (requestId !== activeRequestId.current) return;

        translationCache.current.set(cacheKey, result);
        setTranslatedText(result);
      } catch (translateError) {
        console.error('Translation Error:', translateError);
        if (requestId !== activeRequestId.current) return;
        const errorString = String(
          translateError?.toString?.() ??
            translateError?.message ??
            translateError?.networkError?.message ??
            translateError
        ).toLowerCase();

        const status =
          translateError?.networkError?.statusCode ??
          translateError?.networkError?.status ??
          translateError?.networkError?.response?.status;

        // Never show raw server error strings in UI (can break layout).
        if (
          status === 429 ||
          errorString.includes('429') ||
          errorString.includes('quota exceeded')
        ) {
          setTranslatedText('⚠️ Мережева затримка. Перекладаю...');
          return;
        }

        if (
          status === 503 ||
          errorString.includes('503') ||
          errorString.includes('service unavailable') ||
          errorString.includes('high demand')
        ) {
          setTranslatedText('⏳ Сервери Google зараз перевантажені. Секундочку...');
          return;
        }

        setTranslatedText('❌ Помилка перекладу. Спробуйте ще раз.');
      } finally {
        if (requestId === activeRequestId.current) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [text, sourceLang, targetLang, translate]);

  if (!isAuthenticated) {
    return null;
  }

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
    'min-h-0 flex-1 w-full resize-none rounded-xl border-0 bg-slate-50 p-4 pb-12 text-sm text-slate-900 outline-none ring-0 ring-offset-0 transition-shadow placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-teal-500/50 break-words overflow-x-hidden overflow-y-auto dark:bg-slate-950/50 dark:text-slate-200';

  const inputSpeechLang =
    sourceLang === 'auto' ? 'en-US' : getSpeechLanguage(sourceLang);
  const outputSpeechLang = getSpeechLanguage(targetLang);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden break-words p-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border dark:border-white/5 dark:bg-slate-900 dark:shadow-none">
          <div className="shrink-0 border-b border-slate-100 px-3 py-2 dark:border-white/5">
            <Label htmlFor="input-text" className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
                className="absolute bottom-3 right-3 z-10 rounded-full bg-white/90 p-2 text-slate-500 shadow-md backdrop-blur-sm transition-all hover:bg-slate-100 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-emerald-400"
                title="Listen to text"
                aria-label="Listen to input text"
                disabled={!text.trim()}
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm dark:border dark:border-white/5 dark:bg-slate-900 dark:shadow-none">
          <div className="min-w-[7rem] flex-1">
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger
                id="source-lang"
                className="h-9 w-full rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-900 shadow-none ring-0 transition-shadow focus:ring-2 focus:ring-teal-500/50 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200"
              >
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-100 bg-white shadow-md dark:border-white/10 dark:bg-slate-900">
                {LANGUAGES_WITH_AUTO.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="text-slate-900 focus:bg-slate-100 dark:text-slate-200 dark:focus:bg-slate-800"
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-900 transition-colors hover:bg-slate-100/80 focus:outline-none focus:ring-2 focus:ring-teal-500/50 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-800/80"
            aria-label="Swap languages"
            title="Swap languages"
          >
            ⇄
          </button>

          <div className="min-w-[7rem] flex-1">
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger
                id="target-lang"
                className="h-9 w-full rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-900 shadow-none ring-0 transition-shadow focus:ring-2 focus:ring-teal-500/50 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200"
              >
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-100 bg-white shadow-md dark:border-white/10 dark:bg-slate-900">
                {LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="text-slate-900 focus:bg-slate-100 dark:text-slate-200 dark:focus:bg-slate-800"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border dark:border-white/5 dark:bg-slate-900 dark:shadow-none">
          <div className="shrink-0 border-b border-slate-100 px-3 py-2 dark:border-white/5">
            <Label htmlFor="output-text" className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Output
            </Label>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="relative flex min-h-0 flex-1 flex-col">
              <Textarea
                id="output-text"
                value={isLoading ? '⏳ Translating...' : translatedText}
                readOnly
                placeholder="Translation…"
                className={`${textareaClass} cursor-default ${
                  isLoading ? 'animate-pulse text-slate-500' : 'text-slate-900 dark:text-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => speakText(translatedText, outputSpeechLang)}
                className="absolute bottom-3 right-3 z-10 rounded-full bg-white/90 p-2 text-slate-500 shadow-md backdrop-blur-sm transition-all hover:bg-slate-100 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-emerald-400"
                title="Listen to text"
                aria-label="Listen to translated text"
                disabled={isLoading || !translatedText.trim()}
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Translate;

