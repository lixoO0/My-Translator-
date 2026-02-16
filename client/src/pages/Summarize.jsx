import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { SUMMARIZE_TEXT } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="w-full flex justify-center items-center p-4">
      <Card className="w-full max-w-5xl mx-auto border-slate-800 bg-black/40 backdrop-blur-xl text-slate-100 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            AI Summarizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSummarize} className="space-y-6">
            {/* Робоча зона - Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ліва колонка - Input */}
              <div className="space-y-2">
                <Label htmlFor="input-text" className="text-slate-300">
                  Text to Summarize
                </Label>
                <Textarea
                  id="input-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter text to summarize..."
                  className="min-h-[400px] resize-none bg-slate-950/50 border-slate-700 focus:border-green-500 text-lg p-4 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {/* Права колонка - Summary */}
              <div className="space-y-2">
                <Label htmlFor="output-text" className="text-slate-300">
                  Concise Summary
                </Label>
                <div className="relative">
                  <Textarea
                    id="output-text"
                    value={summarizedText}
                    readOnly
                    placeholder="Summary will appear here..."
                    className="min-h-[400px] resize-none bg-slate-900/50 border-slate-800 text-lg p-4 pr-12 text-slate-100 placeholder:text-slate-500 cursor-default"
                  />
                  <SpeechButton
                    text={summarizedText}
                    className="absolute right-3 top-3"
                    ariaLabel="Speak summary"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2">
                <Label htmlFor="summary-lang" className="text-slate-300">
                  Output Language
                </Label>
                <select
                  id="summary-lang"
                  value={summaryLang}
                  onChange={(e) => setSummaryLang(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-slate-100 focus:border-green-500"
                >
                  <option value="uk">🇺🇦 Ukrainian</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="summary-length" className="text-slate-300">
                  Length
                </Label>
                <select
                  id="summary-length"
                  value={summaryLength}
                  onChange={(e) => setSummaryLength(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-slate-100 focus:border-green-500"
                >
                  <option value="short">Short (Key points)</option>
                  <option value="medium">Medium (Paragraph)</option>
                  <option value="long">Long (Detailed)</option>
                </select>
              </div>
            </div>

            {/* Кнопка */}
            <Button
              type="submit"
              size="lg"
              disabled={loading || !text.trim()}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold text-lg h-12 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Summarizing...' : 'Summarize Text'}
            </Button>

            {/* Помилка */}
            {error && (
              <p className="text-red-400 text-center mt-4 font-medium">
                {error.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Summarize;

