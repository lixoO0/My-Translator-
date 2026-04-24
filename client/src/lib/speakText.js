/**
 * Web Speech API: pick a better voice (prefer Google) and speak.
 * Voices load asynchronously in Chromium — use warmupSpeechSynthesis in useEffect.
 */

export function warmupSpeechSynthesis() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
}

/**
 * @param {string} text
 * @param {string} [langCode='uk-UA'] BCP-47 or short codes 'uk' / 'en'
 * @param {boolean} [_isRetry] internal: avoid infinite wait if no voices ever load
 */
export function speakText(text, langCode = 'uk-UA', _isRetry = false) {
  if (!text?.trim()) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text.trim());

  const normalizedLang =
    langCode === 'uk' ? 'uk-UA' : langCode === 'en' ? 'en-US' : langCode;
  utterance.lang = normalizedLang;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0 && !_isRetry) {
    const synth = window.speechSynthesis;
    const onVoices = () => {
      synth.removeEventListener('voiceschanged', onVoices);
      speakText(text, normalizedLang, true);
    };
    synth.addEventListener('voiceschanged', onVoices);
    return;
  }

  const base = normalizedLang.split('-')[0].toLowerCase();

  if (voices.length > 0) {
    const langMatches = (v) => {
      const l = (v.lang || '').toLowerCase().replace('_', '-');
      return l === normalizedLang.toLowerCase() || l.startsWith(`${base}-`) || l === base;
    };

    let bestVoice = voices.find((v) => langMatches(v) && v.name.includes('Google'));

    if (!bestVoice) {
      bestVoice = voices.find((v) => langMatches(v));
    }

    if (!bestVoice) {
      bestVoice = voices.find((v) => v.lang.toLowerCase().includes(base));
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
    }
  }

  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
