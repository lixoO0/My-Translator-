import { useState, useEffect } from 'react';
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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [summarize, { loading, error }] = useMutation(SUMMARIZE_TEXT, {
    onCompleted: (data) => {
      setSummarizedText(data.summarize.outputResult);
    },
  });

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

  if (!isAuthenticated) {
    return null;
  }

  const handleSummarize = async (e) => {
    e.preventDefault();
    
    if (!text.trim()) {
      return;
    }

    try {
      await summarize({
        variables: {
          text: text.trim(),
          language: summaryLang,
          length: summaryLength,
        },
      });
    } catch (err) {
      console.error('Summarization error:', err);
    }
  };

  const textareaClass =
    'min-h-0 flex-1 w-full resize-none rounded-b-xl border-0 bg-slate-950/50 p-4 pb-12 text-sm text-slate-200 shadow-inner outline-none ring-0 placeholder:text-slate-500 focus-visible:ring-0 break-words overflow-x-hidden overflow-y-auto';

  const summarySpeechLang = SUMMARY_SPEECH_LANG[summaryLang] || 'en-US';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden break-words p-4">
      <form
        onSubmit={handleSummarize}
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

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '…' : 'Summarize'}
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
                value={summarizedText}
                readOnly
                placeholder="Summary…"
                className={`${textareaClass} cursor-default text-slate-200`}
              />
              <button
                type="button"
                onClick={() => speakText(summarizedText, summarySpeechLang)}
                className="absolute bottom-3 right-3 z-10 rounded-full bg-slate-800/80 p-2 text-slate-400 shadow-md backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                title="Listen to text"
                aria-label="Listen to summary"
                disabled={!summarizedText.trim()}
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

export default Summarize;

