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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [summarize, { loading, error }] = useMutation(SUMMARIZE_TEXT, {
    onCompleted: (data) => {
      setSummarizedText(data.summarize.outputResult);
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

  const handleSummarize = async (e) => {
    e.preventDefault();
    
    if (!text.trim()) {
      return;
    }

    try {
      await summarize({
        variables: {
          text: text.trim(),
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

