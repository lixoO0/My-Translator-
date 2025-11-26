import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { History } from '../models/History';

interface Context {
  user?: {
    userId: string;
    email: string;
  };
}

export const historyResolvers = {
  Query: {
    history: async (_: any, __: any, context: Context) => {
      // Перевірка автентифікації
      if (!context.user || !context.user.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        // Отримуємо історію користувача, відсортовану за датою (нові спочатку)
        const historyRecords = await History.find({
          userId: new mongoose.Types.ObjectId(context.user.userId),
        })
          .sort({ createdAt: -1 })
          .limit(100); // Обмежуємо до 100 останніх записів

        // Перетворюємо в формат GraphQL
        return historyRecords.map((record) => ({
          id: String(record._id),
          userId: String(record.userId),
          actionType: record.actionType,
          inputContent: record.inputContent,
          outputResult: record.outputResult,
          metaData: record.metaData || {},
          createdAt: record.createdAt.toISOString(),
        }));
      } catch (error) {
        console.error('🔥 HISTORY ERROR:', error);
        const errorMessage = error instanceof Error 
          ? `Failed to fetch history: ${error.message}` 
          : 'Failed to fetch history';
        
        throw new GraphQLError(errorMessage, {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};

