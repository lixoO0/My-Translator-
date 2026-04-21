import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { Note } from '../models/Note';

interface Context {
  user?: {
    userId: string;
    email: string;
  };
}

export const noteResolvers = {
  Query: {
    getNotes: async (_: any, __: any, context: Context) => {
      if (!context.user || !context.user.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const notes = await Note.find({
        user: new mongoose.Types.ObjectId(context.user.userId),
      }).sort({ createdAt: -1 });

      return notes.map((note) => ({
        id: String(note._id),
        user: String(note.user),
        text: note.text,
        sourceUrl: note.sourceUrl || '',
        createdAt: note.createdAt?.toISOString?.() ?? null,
      }));
    },
  },
  Mutation: {
    createNote: async (
      _: any,
      { text, sourceUrl }: { text: string; sourceUrl?: string },
      context: Context
    ) => {
      if (!context.user || !context.user.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      if (!text || text.trim().length === 0) {
        throw new GraphQLError('Text is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const newNote = new Note({
        user: new mongoose.Types.ObjectId(context.user.userId),
        text: text,
        sourceUrl: sourceUrl || '',
      });

      const saved = await newNote.save();

      return {
        id: String(saved._id),
        user: String(saved.user),
        text: saved.text,
        sourceUrl: saved.sourceUrl || '',
        createdAt: saved.createdAt?.toISOString?.() ?? null,
      };
    },
    deleteNote: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user || !context.user.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new GraphQLError('Invalid note id', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const result = await Note.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        user: new mongoose.Types.ObjectId(context.user.userId),
      });

      return Boolean(result);
    },
  },
};

