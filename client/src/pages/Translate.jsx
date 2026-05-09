import { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { TRANSLATE_TEXT } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Square, Volume2, Trash2 } from 'lucide-react';
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
import { useLocalStorage, WORKSPACE_STORAGE_KEYS } from '@/hooks/useLocalStorage';

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

const DEFAULT_TRANSLATE_WORKSPACE = Object.freeze({
  text: '',
  translatedText: '',
  sourceLang: 'auto',
  targetLang: 'English',
  lastProcessedText: '',
  lastProcessedSettings: null,
});

export const Translate = () => {
  const { t } = useLanguage();
  const languagesWithAuto = useMemo(
    () => [{ value: 'auto', label: t('translate.auto_detect') }, ...LANGUAGES],
    [t]
  );

  const [translateWorkspace, setTranslateWorkspace] = useLocalStorage(
    WORKSPACE_STORAGE_KEYS.translate,
    { ...DEFAULT_TRANSLATE_WORKSPACE }
  );

  const {
    text,
    translatedText,
    sourceLang,
    targetLang,
    lastProcessedText,
    lastProcessedSettings,
  } = translateWorkspace;

  const [isLoading, setIsLoading] = useState(false);
  const [ttsSlot, setTtsSlot] = useState(null);
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
        const nextText = parsed.input ?? '';
        const nextOut = parsed.output ?? '';
        const nextSrc = parsed.sourceLang ?? 'auto';
        const nextTgt = parsed.targetLang ?? 'English';
        const trimmedIn = nextText.trim();
        const hasOut = Boolean(nextOut.trim());
        setTranslateWorkspace({
          ...DEFAULT_TRANSLATE_WORKSPACE,
          text: nextText,
          translatedText: nextOut,
          sourceLang: nextSrc,
          targetLang: nextTgt,
          lastProcessedText: hasOut ? trimmedIn : '',
          lastProcessedSettings: hasOut
            ? { sourceLang: nextSrc, targetLang: nextTgt }
            : null,
        });
        localStorage.removeItem('restoreSession');
      }
    } catch (restoreError) {
      console.error('Failed to restore session data', restoreError);
    }
  }, [setTranslateWorkspace]);

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

  useEffect(() => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      activeRequestId.current += 1;
      setIsLoading(false);
      setTranslateWorkspace((prev) => {
        if (
          prev.translatedText === '' &&
          (prev.lastProcessedText ?? '') === '' &&
          prev.lastProcessedSettings == null
        ) {
          return prev;
        }
        return {
          ...prev,
          translatedText: '',
          lastProcessedText: '',
          lastProcessedSettings: null,
        };
      });
      return;
    }

    const lpText = (lastProcessedText ?? '').trim();
    const outputExists = translatedText.trim() !== '';
    const settingsMatch =
      lastProcessedSettings &&
      sourceLang === lastProcessedSettings.sourceLang &&
      targetLang === lastProcessedSettings.targetLang;

    if (trimmedText === lpText && settingsMatch && outputExists) {
      setIsLoading(false);
      return;
    }

    // Legacy snapshots without lastProcessed* — stamp once so tab switches do not refetch
    if (
      trimmedText &&
      outputExists &&
      lastProcessedSettings == null &&
      lpText === ''
    ) {
      setIsLoading(false);
      setTranslateWorkspace((prev) => ({
        ...prev,
        lastProcessedText: trimmedText,
        lastProcessedSettings: { sourceLang, targetLang },
      }));
      return;
    }

    const cacheKey = `${trimmedText}_${sourceLang}_${targetLang}`;

    if (translationCache.current.has(cacheKey)) {
      setIsLoading(false);
      const cached = translationCache.current.get(cacheKey);
      setTranslateWorkspace((prev) =>
        prev.translatedText === cached &&
        (prev.lastProcessedText ?? '').trim() === trimmedText &&
        prev.lastProcessedSettings &&
        sourceLang === prev.lastProcessedSettings.sourceLang &&
        targetLang === prev.lastProcessedSettings.targetLang
          ? prev
          : {
              ...prev,
              translatedText: cached,
              lastProcessedText: trimmedText,
              lastProcessedSettings: { sourceLang, targetLang },
            }
      );
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

        if (requestId !== activeRequestId.current) return;

        translationCache.current.set(cacheKey, result);
        setTranslateWorkspace((prev) => ({
          ...prev,
          translatedText: result,
          lastProcessedText: trimmedText,
          lastProcessedSettings: { sourceLang, targetLang },
        }));
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

        let message = t('translate.error_generic');
        if (
          status === 429 ||
          errorString.includes('429') ||
          errorString.includes('quota exceeded')
        ) {
          message = t('translate.error_delay');
        } else if (
          status === 503 ||
          errorString.includes('503') ||
          errorString.includes('service unavailable') ||
          errorString.includes('high demand')
        ) {
          message = t('translate.error_busy');
        }

        setTranslateWorkspace((prev) => ({
          ...prev,
          translatedText: message,
          lastProcessedText: trimmedText,
          lastProcessedSettings: { sourceLang, targetLang },
        }));
      } finally {
        if (requestId === activeRequestId.current) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    text,
    translatedText,
    sourceLang,
    targetLang,
    lastProcessedText,
    lastProcessedSettings,
    translate,
    t,
    setTranslateWorkspace,
  ]);

  if (!isAuthenticated) {
    return null;
  }

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') {
      setTranslateWorkspace((prev) => ({
        ...prev,
        sourceLang: prev.targetLang,
        targetLang: 'English',
        text: prev.translatedText || prev.text,
        translatedText: '',
        lastProcessedText: '',
        lastProcessedSettings: null,
      }));
      return;
    }

    setTranslateWorkspace((prev) => ({
      ...prev,
      sourceLang: prev.targetLang,
      targetLang: prev.sourceLang,
      text: prev.translatedText || prev.text,
      translatedText: '',
      lastProcessedText: '',
      lastProcessedSettings: null,
    }));
  };

  const clearWorkspace = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setTtsSlot(null);
    translationCache.current.clear();
    activeRequestId.current += 1;
    setIsLoading(false);
    setTranslateWorkspace({ ...DEFAULT_TRANSLATE_WORKSPACE });
  };

  const inputSpeechLang =
    sourceLang === 'auto' ? 'en-US' : getSpeechLanguage(sourceLang);
  const outputSpeechLang = getSpeechLanguage(targetLang);

  const handleSpeak = (slot, rawText, lang) => {
    const utterance = (rawText ?? '').trim();
    if (!utterance || typeof window === 'undefined' || !window.speechSynthesis) return;

    if (window.speechSynthesis.speaking && ttsSlot === slot) {
      window.speechSynthesis.cancel();
      setTtsSlot(null);
      return;
    }

    window.speechSynthesis.cancel();
    setTtsSlot(null);

    speakText(utterance, lang, {
      onStart: () => setTtsSlot(slot),
      onEnd: () => setTtsSlot(null),
      onError: () => setTtsSlot(null),
    });
  };

  const hasWorkspaceContent =
    Boolean(text.trim()) ||
    Boolean(translatedText.trim()) ||
    sourceLang !== DEFAULT_TRANSLATE_WORKSPACE.sourceLang ||
    targetLang !== DEFAULT_TRANSLATE_WORKSPACE.targetLang;

  return (
    <div className="pait-page-stack">
      <section className="pait-io-card">
        <div className="pait-io-head">
          <div className="pait-io-head-row">
            <Label htmlFor="input-text" className="pait-io-label">
              {t('translate.input')}
            </Label>
            <button
              type="button"
              className="pait-io-clear-btn"
              onClick={clearWorkspace}
              disabled={!hasWorkspaceContent}
              title={t('workspace.clear')}
              aria-label={t('workspace.clear')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="pait-io-body">
          <div className="pait-io-inner">
            <Textarea
              id="input-text"
              value={text}
              onChange={(e) =>
                setTranslateWorkspace((prev) => ({ ...prev, text: e.target.value }))
              }
              placeholder={t('translate.placeholder_input')}
              className="pait-textarea-io min-h-0 flex-1 overflow-x-hidden overflow-y-auto break-words focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              type="button"
              onClick={() => handleSpeak('input', text, inputSpeechLang)}
              className={`pait-icon-btn ${ttsSlot === 'input' ? 'pait-tts-playing' : ''}`}
              title={ttsSlot === 'input' ? t('translate.stop') : t('translate.listen_input')}
              aria-label={ttsSlot === 'input' ? t('translate.stop_speech') : t('translate.listen_input')}
              disabled={!text.trim()}
            >
              {ttsSlot === 'input' ? (
                <Square className="h-5 w-5 fill-current" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </section>

      <div className="pait-toolbar">
        <div className="pait-toolbar-slot">
          <Select
            value={sourceLang}
            onValueChange={(v) =>
              setTranslateWorkspace((prev) => ({ ...prev, sourceLang: v }))
            }
          >
            <SelectTrigger id="source-lang" className="pait-select-trigger">
              <SelectValue placeholder={t('translate.from')} />
            </SelectTrigger>
            <SelectContent className="pait-select-content">
              {languagesWithAuto.map((lang) => (
                <SelectItem key={lang.value} value={lang.value} className="pait-select-item">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={handleSwapLanguages}
          className="pait-swap-btn"
          aria-label={t('translate.swap')}
          title={t('translate.swap')}
        >
          ⇄
        </button>

        <div className="pait-toolbar-slot">
          <Select
            value={targetLang}
            onValueChange={(v) =>
              setTranslateWorkspace((prev) => ({ ...prev, targetLang: v }))
            }
          >
            <SelectTrigger id="target-lang" className="pait-select-trigger">
              <SelectValue placeholder={t('translate.to')} />
            </SelectTrigger>
            <SelectContent className="pait-select-content">
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value} className="pait-select-item">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="pait-io-card">
        <div className="pait-io-head">
          <Label htmlFor="output-text" className="pait-io-label">
            {t('translate.output')}
          </Label>
        </div>
        <div className="pait-io-body">
          <div className="pait-io-inner">
            <Textarea
              id="output-text"
              value={isLoading ? `⏳ ${t('translate.translating')}` : translatedText}
              readOnly
              placeholder={t('translate.placeholder_output')}
              className={`pait-textarea-io min-h-0 flex-1 cursor-default overflow-x-hidden overflow-y-auto break-words focus-visible:ring-0 focus-visible:ring-offset-0 ${
                isLoading ? 'animate-pulse pait-textarea-io--muted' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => handleSpeak('output', translatedText, outputSpeechLang)}
              className={`pait-icon-btn ${ttsSlot === 'output' ? 'pait-tts-playing' : ''}`}
              title={ttsSlot === 'output' ? t('translate.stop') : t('translate.listen_output')}
              aria-label={ttsSlot === 'output' ? t('translate.stop_speech') : t('translate.listen_output')}
              disabled={isLoading || !translatedText.trim()}
            >
              {ttsSlot === 'output' ? (
                <Square className="h-5 w-5 fill-current" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Translate;
