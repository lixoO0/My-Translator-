import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './schema/typeDefs';
import { authResolvers } from './resolvers/authResolvers';
import { translateResolvers } from './resolvers/translateResolvers';
import { summarizeResolvers } from './resolvers/summarizeResolvers';
import { historyResolvers } from './resolvers/historyResolvers';
import { getAuthContext } from './utils/auth';
import { getAudioBase64 } from 'google-tts-api';

const resolvers = {
  JSON: {
    // JSON scalar resolver - просто повертає значення як є
    serialize: (value: any) => value,
    parseValue: (value: any) => value,
    parseLiteral: (ast: any) => {
      switch (ast.kind) {
        case 'StringValue':
          return ast.value;
        case 'IntValue':
          return parseInt(ast.value, 10);
        case 'FloatValue':
          return parseFloat(ast.value);
        case 'BooleanValue':
          return ast.value;
        case 'ObjectValue':
          const obj: any = {};
          ast.fields.forEach((field: any) => {
            obj[field.name.value] = field.value.value;
          });
          return obj;
        default:
          return null;
      }
    },
  },
  Query: {
    _health: () => 'ok',
    ...authResolvers.Query,
    ...historyResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...translateResolvers.Mutation,
    ...summarizeResolvers.Mutation,
    ...historyResolvers.Mutation,
  },
};

export const createApp = async () => {
  const app = express();

  app.use(
    cors({
      origin: [
        'http://localhost:5173',
        'https://pait-client.onrender.com',
        'chrome-extension://gpgamcjeklioldlfdljojppdpcmomhah',
      ],
      credentials: true,
    })
  );
  app.use(bodyParser.json());

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/api/tts', async (req, res) => {
    const { text, lang } = req.body || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!lang || typeof lang !== 'string') {
      return res.status(400).json({ error: 'Language is required' });
    }

    try {
      const audioBase64 = await getAudioBase64(text, {
        lang,
        slow: false,
        host: 'https://translate.google.com',
      });
      return res.json({ audioBase64 });
    } catch (error) {
      console.error('TTS error:', error);
      return res.status(500).json({ error: 'Failed to generate audio' });
    }
  });

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const apolloServer = new ApolloServer({ schema });
  await apolloServer.start();

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        // Передаємо контекст з інформацією про користувача
        return getAuthContext(req as express.Request);
      },
    })
  );

  return app;
};
