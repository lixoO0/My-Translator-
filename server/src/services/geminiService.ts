import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Перевірка API ключа
console.log('Checking API Key:', GEMINI_API_KEY ? `Exists (length: ${GEMINI_API_KEY.length})` : 'MISSING');

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const translateText = async (text: string, targetLang: string, sourceLang?: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Формуємо промпт
    let prompt: string;
    if (sourceLang) {
      prompt = `You are a professional translator. Translate the following text from ${sourceLang} into ${targetLang}. Return ONLY the translated text, without any explanations or quotes. Text: ${text}`;
    } else {
      prompt = `You are a professional translator. Translate the following text into ${targetLang}. Return ONLY the translated text, without any explanations or quotes. Text: ${text}`;
    }

    // Отримуємо результат від AI
    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Перевіряємо, чи є кандидати в відповіді
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      console.warn('⚠️ Gemini returned no candidates - content may be blocked by Safety Filters');
      return '[Content blocked by AI Safety Filters]';
    }

    // Перевіряємо, чи є blockedReason
    const firstCandidate = candidates[0];
    if (firstCandidate.finishReason === 'SAFETY' || firstCandidate.finishReason === 'RECITATION') {
      console.warn('⚠️ Content blocked by Gemini Safety Filters');
      return '[Content blocked by AI Safety Filters]';
    }

    // Отримуємо текст відповіді
    let translatedText: string;
    try {
      translatedText = response.text();
    } catch (textError) {
      console.warn('⚠️ Failed to extract text from response - content may be blocked');
      return '[Content blocked by AI Safety Filters]';
    }

    // Перевіряємо, чи текст не порожній після обробки
    const cleanedText = translatedText.trim().replace(/^["']|["']$/g, '');
    if (!cleanedText || cleanedText.length === 0) {
      console.warn('⚠️ Translated text is empty - content may be blocked by Safety Filters');
      return '[Content blocked by AI Safety Filters]';
    }

    return cleanedText;
  } catch (error) {
    console.error('🔥 GEMINI SERVICE ERROR:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
    
    // Перевіряємо, чи це помилка блокування контенту
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('SAFETY') || 
        errorMessage.includes('blocked') || 
        errorMessage.includes('safety') ||
        errorMessage.includes('RECITATION')) {
      console.warn('⚠️ Content blocked by Safety Filters');
      return '[Content blocked by AI Safety Filters]';
    }
    
    // Для інших помилок все ще кидаємо exception
    throw new Error(`Failed to translate text: ${errorMessage}`);
  }
};

export const summarizeText = async (
  text: string,
  targetLanguage: string = 'en',
  length: string = 'medium'
): Promise<string> => {
  try {
    const language = (targetLanguage ?? '').toString().trim();
    console.log('Summarize requested in language:', language);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Формуємо промпт
    let prompt: string;
    const languageMap: Record<string, string> = {
      uk: 'Ukrainian',
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      pl: 'Polish',
      it: 'Italian',
      pt: 'Portuguese',
      tr: 'Turkish',
      ar: 'Arabic',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
    };

    // If language is mapped, use full name; otherwise keep as-is.
    const fullLanguageName = language
      ? languageMap[language.toLowerCase()] || language
      : 'English';

    const langPrompt = `You MUST output the summary STRICTLY in ${fullLanguageName}. NO EXCEPTIONS.`;

    if (length === 'short') {
      prompt = `You are a professional summarizer.
${langPrompt}
Provide a very brief summary in 1-2 sentences max.
Text to summarize: ${text}`;
    } else if (length === 'long') {
      prompt = `You are a professional summarizer.
${langPrompt}
Provide a detailed, comprehensive summary with key points.
Text to summarize: ${text}`;
    } else {
      prompt = `You are a professional summarizer.
${langPrompt}
Provide a standard, concise summary.
Text to summarize: ${text}`;
    }

    // Отримуємо результат від AI
    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Перевіряємо, чи є кандидати в відповіді
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      console.warn('⚠️ Gemini returned no candidates - content may be blocked by Safety Filters');
      return '[Content blocked by AI Safety Filters]';
    }

    // Перевіряємо, чи є blockedReason
    const firstCandidate = candidates[0];
    if (firstCandidate.finishReason === 'SAFETY' || firstCandidate.finishReason === 'RECITATION') {
      console.warn('⚠️ Content blocked by Gemini Safety Filters');
      return '[Content blocked by AI Safety Filters]';
    }

    // Отримуємо текст відповіді
    let summarizedText: string;
    try {
      summarizedText = response.text();
    } catch (textError) {
      console.warn('⚠️ Failed to extract text from response - content may be blocked');
      return '[Content blocked by AI Safety Filters]';
    }

    // Перевіряємо, чи текст не порожній після обробки
    const cleanedText = summarizedText.trim().replace(/^["']|["']$/g, '');
    if (!cleanedText || cleanedText.length === 0) {
      console.warn('⚠️ Summarized text is empty - content may be blocked by Safety Filters');
      return '[Content blocked by AI Safety Filters]';
    }

    return cleanedText;
  } catch (error) {
    console.error('🔥 GEMINI SERVICE ERROR:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
    
    // Перевіряємо, чи це помилка блокування контенту
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('SAFETY') || 
        errorMessage.includes('blocked') || 
        errorMessage.includes('safety') ||
        errorMessage.includes('RECITATION')) {
      console.warn('⚠️ Content blocked by Safety Filters');
      return '[Content blocked by AI Safety Filters]';
    }
    
    // Для інших помилок все ще кидаємо exception
    throw new Error(`Failed to summarize text: ${errorMessage}`);
  }
};

