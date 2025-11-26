import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { History } from '../models/History';
import { translateText } from '../services/geminiService';

interface Context {
  user?: {
    userId: string;
    email: string;
  };
}

export const translateResolvers = {
  Mutation: {
    translate: async (
      _: any,
      { text, sourceLang, targetLang }: { text: string; sourceLang?: string; targetLang: string },
      context: Context
    ) => {
      // Перевірка автентифікації
      if (!context.user || !context.user.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Валідація вхідних даних
      if (!text || text.trim().length === 0) {
        throw new GraphQLError('Text is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (!targetLang || targetLang.trim().length === 0) {
        throw new GraphQLError('Target language is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      try {
        // Викликаємо сервіс для перекладу
        const translatedText = await translateText(text, targetLang, sourceLang);

        // Зберігаємо запис у MongoDB
        const historyRecord = new History({
          userId: new mongoose.Types.ObjectId(context.user.userId),
          actionType: 'TRANSLATE',
          inputContent: text,
          outputResult: translatedText,
          metaData: {
            sourceLang: sourceLang || 'auto',
            targetLang: targetLang,
          },
        });

        await historyRecord.save();

        // Повертаємо збережений об'єкт
        return {
          id: String(historyRecord._id),
          userId: String(historyRecord.userId),
          actionType: historyRecord.actionType,
          inputContent: historyRecord.inputContent,
          outputResult: historyRecord.outputResult,
          metaData: historyRecord.metaData,
          createdAt: historyRecord.createdAt.toISOString(),
        };
      } catch (error) {
        console.error('🔥 GEMINI ERROR in translate mutation:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : typeof error,
        });
        
        if (error instanceof GraphQLError) {
          throw error;
        }
        
        const errorMessage = error instanceof Error 
          ? `Translation failed: ${error.message}` 
          : 'Failed to translate text';
        
        throw new GraphQLError(errorMessage, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};

