import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { History } from '../models/History';
import { summarizeText } from '../services/geminiService';

interface Context {
  user?: {
    userId: string;
    email: string;
  };
}

export const summarizeResolvers = {
  Mutation: {
    summarize: async (
      _: any,
      { text, language, length }: { text: string; language?: string; length?: string },
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

      try {
        // Викликаємо сервіс для сумаризації
        const summarizedText = await summarizeText(text, language, length);

        // Зберігаємо запис у MongoDB
        const historyRecord = new History({
          userId: new mongoose.Types.ObjectId(context.user.userId),
          actionType: 'SUMMARIZE',
          inputContent: text,
          outputResult: summarizedText,
          metaData: {
            ...(language ? { targetLang: language } : {}),
            ...(length ? { summaryLength: length } : {}),
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
        console.error('🔥 GEMINI ERROR in summarize mutation:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : typeof error,
        });
        
        if (error instanceof GraphQLError) {
          throw error;
        }
        
        const errorMessage = error instanceof Error 
          ? `Summarization failed: ${error.message}` 
          : 'Failed to summarize text';
        
        throw new GraphQLError(errorMessage, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};

