import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { SUMMARIZE_TEXT } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Square, Volume2, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { speakText, warmupSpeechSynthesis } from '@/lib/speakText';
import { useLocalStorage, WORKSPACE_STORAGE_KEYS } from '@/hooks/useLocalStorage';

const SUMMARY_SPEECH_LANG = {
  uk: 'uk-UA',
  en: 'en-US',
};

const DEFAULT_SUMMARIZE_WORKSPACE = Object.freeze({
  text: '',
  summarizedText: '',
  summaryLang: 'uk',
  summaryLength: 'short',
  lastProcessedText: '',
  lastProcessedSettings: null,
});

export const Summarize = () => {
  const { t } = useLanguage();

  const [summarizeWorkspace, setSummarizeWorkspace] = useLocalStorage(
    WORKSPACE_STORAGE_KEYS.summarize,
    { ...DEFAULT_SUMMARIZE_WORKSPACE }
  );

  const {
    text,
    summarizedText,
    summaryLang,
    summaryLength,
    lastProcessedText,
    lastProcessedSettings,
  } = summarizeWorkspace;

  const [isLoading, setIsLoading] = useState(false);
  const [ttsSlot, setTtsSlot] = useState(null);
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
        const nextText = parsed.input ?? '';
        const nextOut = parsed.output ?? '';
        const nextLang = parsed.summaryLang ?? DEFAULT_SUMMARIZE_WORKSPACE.summaryLang;
        const nextLen = parsed.summaryLength ?? DEFAULT_SUMMARIZE_WORKSPACE.summaryLength;
        const trimmedIn = nextText.trim();
        const hasOut = Boolean(nextOut.trim());
        setSummarizeWorkspace({
          ...DEFAULT_SUMMARIZE_WORKSPACE,
          text: nextText,
          summarizedText: nextOut,
          summaryLang: nextLang,
          summaryLength: nextLen,
          lastProcessedText: hasOut ? trimmedIn : '',
          lastProcessedSettings: hasOut
            ? { summaryLang: nextLang, summaryLength: nextLen }
            : null,
        });
        localStorage.removeItem('restoreSession');
      }
    } catch (restoreError) {
      console.error('Failed to restore session data', restoreError);
    }
  }, [setSummarizeWorkspace]);

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
      setSummarizeWorkspace((prev) => {
        if (
          prev.summarizedText === '' &&
          (prev.lastProcessedText ?? '') === '' &&
          prev.lastProcessedSettings == null
        ) {
          return prev;
        }
        return {
          ...prev,
          summarizedText: '',
          lastProcessedText: '',
          lastProcessedSettings: null,
        };
      });
      return;
    }

    const lpText = (lastProcessedText ?? '').trim();
    const outputExists = summarizedText.trim() !== '';
    const settingsMatch =
      lastProcessedSettings &&
      summaryLang === lastProcessedSettings.summaryLang &&
      summaryLength === lastProcessedSettings.summaryLength;

    if (trimmedText === lpText && settingsMatch && outputExists) {
      setIsLoading(false);
      return;
    }

    if (
      trimmedText &&
      outputExists &&
      lastProcessedSettings == null &&
      lpText === ''
    ) {
      setIsLoading(false);
      setSummarizeWorkspace((prev) => ({
        ...prev,
        lastProcessedText: trimmedText,
        lastProcessedSettings: { summaryLang, summaryLength },
      }));
      return;
    }

    const cacheKey = `${trimmedText}_${summaryLength}_${summaryLang}`;
    if (summaryCache.current.has(cacheKey)) {
      setIsLoading(false);
      const cached = summaryCache.current.get(cacheKey);
      setSummarizeWorkspace((prev) =>
        prev.summarizedText === cached &&
        (prev.lastProcessedText ?? '').trim() === trimmedText &&
        prev.lastProcessedSettings &&
        summaryLang === prev.lastProcessedSettings.summaryLang &&
        summaryLength === prev.lastProcessedSettings.summaryLength
          ? prev
          : {
              ...prev,
              summarizedText: cached,
              lastProcessedText: trimmedText,
              lastProcessedSettings: { summaryLang, summaryLength },
            }
      );
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
        setSummarizeWorkspace((prev) => ({
          ...prev,
          summarizedText: result,
          lastProcessedText: trimmedText,
          lastProcessedSettings: { summaryLang, summaryLength },
        }));
      } catch (summarizeError) {
        console.error('Summarization Error:', summarizeError);
        if (requestId !== activeRequestId.current) return;
        setSummarizeWorkspace((prev) => ({
          ...prev,
          summarizedText: t('summarize.error_generic'),
          lastProcessedText: trimmedText,
          lastProcessedSettings: { summaryLang, summaryLength },
        }));
      } finally {
        if (requestId === activeRequestId.current) {
          setIsLoading(false);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    text,
    summarizedText,
    summaryLength,
    summaryLang,
    lastProcessedText,
    lastProcessedSettings,
    summarize,
    t,
    setSummarizeWorkspace,
  ]);

  if (!isAuthenticated) {
    return null;
  }

  const summarySpeechLang = SUMMARY_SPEECH_LANG[summaryLang] || 'en-US';

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

  const clearWorkspace = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setTtsSlot(null);
    summaryCache.current.clear();
    activeRequestId.current += 1;
    setIsLoading(false);
    setSummarizeWorkspace({ ...DEFAULT_SUMMARIZE_WORKSPACE });
  };

  const hasWorkspaceContent =
    Boolean(text.trim()) ||
    Boolean(summarizedText.trim()) ||
    summaryLang !== DEFAULT_SUMMARIZE_WORKSPACE.summaryLang ||
    summaryLength !== DEFAULT_SUMMARIZE_WORKSPACE.summaryLength;

  return (
    <div className="pait-page-stack">
      <section className="pait-io-card">
        <div className="pait-io-head">
          <div className="pait-io-head-row">
            <Label htmlFor="input-text" className="pait-io-label">
              {t('summarize.input')}
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
                setSummarizeWorkspace((prev) => ({ ...prev, text: e.target.value }))
              }
              placeholder={t('summarize.placeholder_input')}
              className="pait-textarea-io min-h-0 flex-1 overflow-x-hidden overflow-y-auto break-words focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              type="button"
              onClick={() => handleSpeak('input', text, summarySpeechLang)}
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
          <select
            id="summary-lang"
            value={summaryLang}
            onChange={(e) =>
              setSummarizeWorkspace((prev) => ({ ...prev, summaryLang: e.target.value }))
            }
            className="pait-native-select"
          >
            <option value="uk">{t('summarize.lang_uk')}</option>
            <option value="en">{t('summarize.lang_en')}</option>
          </select>
        </div>

        <div className="pait-toolbar-slot">
          <select
            id="summary-length"
            value={summaryLength}
            onChange={(e) =>
              setSummarizeWorkspace((prev) => ({ ...prev, summaryLength: e.target.value }))
            }
            className="pait-native-select"
          >
            <option value="short">{t('summarize.len_short')}</option>
            <option value="medium">{t('summarize.len_medium')}</option>
            <option value="long">{t('summarize.len_long')}</option>
          </select>
        </div>
      </div>

      <section className="pait-io-card">
        <div className="pait-io-head">
          <Label htmlFor="output-text" className="pait-io-label">
            {t('summarize.output')}
          </Label>
        </div>
        <div className="pait-io-body">
          <div className="pait-io-inner">
            <Textarea
              id="output-text"
              value={isLoading ? `⏳ ${t('summarize.summarizing')}` : summarizedText}
              readOnly
              placeholder={t('summarize.placeholder_output')}
              className={`pait-textarea-io min-h-0 flex-1 cursor-default overflow-x-hidden overflow-y-auto break-words focus-visible:ring-0 focus-visible:ring-offset-0 ${
                isLoading ? 'animate-pulse pait-textarea-io--muted' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => handleSpeak('output', summarizedText, summarySpeechLang)}
              className={`pait-icon-btn ${ttsSlot === 'output' ? 'pait-tts-playing' : ''}`}
              title={ttsSlot === 'output' ? t('translate.stop') : t('translate.listen')}
              aria-label={ttsSlot === 'output' ? t('translate.stop_speech') : t('translate.listen')}
              disabled={isLoading || !summarizedText.trim()}
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

export default Summarize;
