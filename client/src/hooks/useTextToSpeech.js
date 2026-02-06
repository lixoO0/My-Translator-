import { useCallback, useEffect, useRef, useState } from 'react';

const LANGUAGE_MAP = {
  English: 'en',
  Ukrainian: 'uk',
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Italian: 'it',
  Portuguese: 'pt',
  Polish: 'pl',
  Japanese: 'ja',
  Chinese: 'zh',
  Korean: 'ko',
  Arabic: 'ar',
  Turkish: 'tr',
};

const resolveLanguageCode = (language) => {
  if (!language || language === 'auto') return 'en';
  if (LANGUAGE_MAP[language]) return LANGUAGE_MAP[language];
  if (typeof language === 'string' && language.includes('-')) {
    return language.split('-')[0];
  }
  return language;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    async (text, language) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      stop();
      setIsLoading(true);

      try {
        const languageCode = resolveLanguageCode(language);
        const response = await fetch(`${API_BASE_URL}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, lang: languageCode }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch audio');
        }

        const { audioBase64 } = await response.json();
        if (!audioBase64) {
          throw new Error('Audio data missing');
        }

        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audioRef.current = audio;

        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);

        setIsLoading(false);
        setIsPlaying(true);
        await audio.play();
      } catch (error) {
        setIsLoading(false);
        setIsPlaying(false);
      }
    },
    [stop]
  );

  useEffect(() => () => stop(), [stop]);

  return { speak, stop, isPlaying, isLoading };
};
