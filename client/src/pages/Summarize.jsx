import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { SUMMARIZE_TEXT } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import SpeechButton from '@/components/ui/SpeechButton';

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

  return (
    <div className="w-full h-full flex flex-col overflow-x-hidden break-words">
      <form
        onSubmit={handleSummarize}
        className="w-full flex-1 min-h-0 flex flex-col gap-2 overflow-hidden"
      >
        {/* Level 1: Input */}
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
          </div>
        </div>

        {/* Level 2: Control bar */}
        <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1">
          <div className="flex-1 min-w-0">
            <select
              id="summary-lang"
              value={summaryLang}
              onChange={(e) => setSummaryLang(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-700 bg-transparent bg-slate-800 text-slate-100 px-2 text-sm focus:border-green-500"
            >
              <option value="uk" className="bg-slate-800 text-slate-100">
                Ukrainian
              </option>
              <option value="en" className="bg-slate-800 text-slate-100">
                English
              </option>
            </select>
          </div>

          <div className="flex-1 min-w-0">
            <select
              id="summary-length"
              value={summaryLength}
              onChange={(e) => setSummaryLength(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-700 bg-transparent bg-slate-800 text-slate-100 px-2 text-sm focus:border-green-500"
            >
              <option value="short" className="bg-slate-800 text-slate-100">
                Short
              </option>
              <option value="medium" className="bg-slate-800 text-slate-100">
                Medium
              </option>
              <option value="long" className="bg-slate-800 text-slate-100">
                Long
              </option>
            </select>
          </div>

          <Button
            type="submit"
            disabled={loading || !text.trim()}
            className="h-8 shrink-0 rounded-md bg-green-600 px-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '…' : 'Summarize'}
          </Button>
        </div>

        {/* Level 3: Output */}
        <div className="flex-1 basis-0 min-h-0 flex flex-col gap-1">
          <Label htmlFor="output-text" className="text-slate-300 text-xs">
            Output
          </Label>
          <div className="relative flex-1 min-h-0">
            <Textarea
              id="output-text"
              value={summarizedText}
              readOnly
              placeholder="Summary…"
              className="h-full min-h-0 resize-none overflow-y-auto rounded-md border border-slate-700 bg-slate-800/40 p-2 pr-9 text-sm text-slate-100 placeholder:text-slate-400 cursor-default break-words overflow-x-hidden"
            />
            <SpeechButton
              text={summarizedText}
              className="absolute bottom-2 right-2"
              ariaLabel="Speak summary"
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

export default Summarize;

