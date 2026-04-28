import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { SUMMARIZE_TEXT } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { speakText, warmupSpeechSynthesis } from '@/lib/speakText';

const SUMMARY_SPEECH_LANG = {
  uk: 'uk-UA',
  en: 'en-US',
};

export const Summarize = () => {
  const [text, setText] = useState('');
  const [summarizedText, setSummarizedText] = useState('');
  const [summaryLang, setSummaryLang] = useState('uk');
  const [summaryLength, setSummaryLength] = useState('short');
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const summaryCache = useRef(new Map());
  const activeRequestId = useRef(0);

  const [summarize] = useMutation(SUMMARIZE_TEXT);

  useEffect(() => {
    const savedSession = localStorage.getItem('restoreSession');
    if (!savedSession) return;

    try {
      const parsed = JSON.parse(savedSession);
      if (parsed?.type === 'SUMMARIZE') {
        setText(parsed.input || '');
        setSummarizedText(parsed.output || '');
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

  // Live summarize with cache + debounce.
  useEffect(() => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      activeRequestId.current += 1;
      setIsLoading(false);
      setSummarizedText('');
      return;
    }

    // Include language in cache key to avoid returning summaries in the wrong language
    // when user switches the language selector.
    const cacheKey = `${trimmedText}_${summaryLength}_${summaryLang}`;
    if (summaryCache.current.has(cacheKey)) {
      setIsLoading(false);
      setSummarizedText(summaryCache.current.get(cacheKey));
      return;
    }

    setIsLoading(true);
    const requestId = (activeRequestId.current += 1);

    const timer = setTimeout(async () => {
      try {
        const { data } = await summarize({
          variables: {
            text: trimmedText,
            language: (summaryLang ?? '').toString().trim() || 'uk',
            length: summaryLength,
          },
        });

        const result = data?.summarize?.outputResult ?? '';
        if (requestId !== activeRequestId.current) return;

        summaryCache.current.set(cacheKey, result);
        setSummarizedText(result);
      } catch (summarizeError) {
        console.error('Summarization Error:', summarizeError);
        if (requestId !== activeRequestId.current) return;
        setSummarizedText('❌ Помилка сумаризації. Спробуйте ще раз.');
      } finally {
        if (requestId === activeRequestId.current) {
          setIsLoading(false);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [text, summaryLength, summaryLang, summarize]);

  if (!isAuthenticated) {
    return null;
  }

  const textareaClass =
    'min-h-0 flex-1 w-full resize-none rounded-b-xl border-0 bg-slate-950/50 p-4 pb-12 text-sm text-slate-200 shadow-inner outline-none ring-0 placeholder:text-slate-500 focus-visible:ring-0 break-words overflow-x-hidden overflow-y-auto';

  const summarySpeechLang = SUMMARY_SPEECH_LANG[summaryLang] || 'en-US';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden break-words p-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
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
                onClick={() => speakText(text, summarySpeechLang)}
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
            <select
              id="summary-lang"
              value={summaryLang}
              onChange={(e) => setSummaryLang(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-600/80 bg-slate-950/40 px-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
            >
              <option value="uk">Ukrainian</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="min-w-[7rem] flex-1">
            <select
              id="summary-length"
              value={summaryLength}
              onChange={(e) => setSummaryLength(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-600/80 bg-slate-950/40 px-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>

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
                value={isLoading ? '⏳ Summarizing...' : summarizedText}
                readOnly
                placeholder="Summary…"
                className={`${textareaClass} cursor-default ${
                  isLoading ? 'text-slate-500 animate-pulse' : 'text-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => speakText(summarizedText, summarySpeechLang)}
                className="absolute bottom-3 right-3 z-10 rounded-full bg-slate-800/80 p-2 text-slate-400 shadow-md backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                title="Listen to text"
                aria-label="Listen to summary"
                disabled={isLoading || !summarizedText.trim()}
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

export default Summarize;

