import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { TRANSLATE_TEXT } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import SpeechButton from '@/components/ui/SpeechButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  // Перевірка автентифікації
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const savedSession = localStorage.getItem('restoreSession');

    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.type === 'TRANSLATION') {
          console.log('Restoring session:', parsed);
          setText(parsed.input || '');
          setTranslatedText(parsed.output || '');
          setSourceLang(parsed.sourceLang || 'auto');
          setTargetLang(parsed.targetLang || 'en');

          localStorage.removeItem('restoreSession');
        }
      } catch (e) {
        console.error('Error parsing session data', e);
      }
    }
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

  return (
    <div className="w-full flex justify-center items-center p-4">
      <Card className="w-full max-w-5xl mx-auto border-slate-800 bg-black/40 backdrop-blur-xl text-slate-100 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            AI Translator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTranslate} className="space-y-6">
            {/* Панель керування - Вибір мови */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-lang" className="text-slate-300">
                  From (Source Language)
                </Label>
                <Select value={sourceLang} onValueChange={setSourceLang}>
                  <SelectTrigger
                    id="source-lang"
                    className="bg-slate-950/50 border-slate-700 text-slate-100 focus:border-green-500"
                  >
                    <SelectValue placeholder="Select source language" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {LANGUAGES_WITH_AUTO.map((lang) => (
                      <SelectItem
                        key={lang.value}
                        value={lang.value}
                        className="text-slate-100 focus:bg-slate-800"
                      >
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-lang" className="text-slate-300">
                  To (Target Language)
                </Label>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger
                    id="target-lang"
                    className="bg-slate-950/50 border-slate-700 text-slate-100 focus:border-green-500"
                  >
                    <SelectValue placeholder="Select target language" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {LANGUAGES.map((lang) => (
                      <SelectItem
                        key={lang.value}
                        value={lang.value}
                        className="text-slate-100 focus:bg-slate-800"
                      >
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Робоча зона - Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Ліва колонка - Ввід */}
              <div className="space-y-2">
                <Label htmlFor="input-text" className="text-slate-300">
                  Input Text
                </Label>
                <div className="relative">
                  <Textarea
                    id="input-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text to translate..."
                    className="min-h-[300px] resize-none bg-slate-950/50 border-slate-700 focus:border-green-500 text-lg p-4 pr-12 text-slate-100 placeholder:text-slate-500"
                  />
                  <SpeechButton
                    text={text}
                    language={
                      sourceLang === 'auto' ? undefined : getSpeechLanguage(sourceLang)
                    }
                    className="absolute right-3 top-3"
                    ariaLabel="Speak input text"
                  />
                </div>
              </div>

              {/* Права колонка - Результат */}
              <div className="space-y-2">
                <Label htmlFor="output-text" className="text-slate-300">
                  Translation
                </Label>
                <div className="relative">
                  <Textarea
                    id="output-text"
                    value={translatedText}
                    readOnly
                    placeholder="Translation will appear here..."
                    className="min-h-[300px] resize-none bg-slate-900/50 border-slate-800 text-lg p-4 pr-12 text-slate-100 placeholder:text-slate-500 cursor-default"
                  />
                  <SpeechButton
                    text={translatedText}
                    language={getSpeechLanguage(targetLang)}
                    className="absolute right-3 top-3"
                    ariaLabel="Speak translated text"
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
              {loading ? 'Translating...' : 'Translate Text'}
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

export default Translate;

