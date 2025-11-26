import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { makeExecutableSchema } from '@graphql-tools/schema';
import mongoose from 'mongoose';
import { typeDefs } from './schema/typeDefs';
import { authResolvers } from './resolvers/authResolvers';
import { translateResolvers } from './resolvers/translateResolvers';
import { historyResolvers } from './resolvers/historyResolvers';
import { getAuthContext } from './utils/auth';

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
  },
};

async function startServer() {
  const app = express();
  app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
  }));
  app.use(bodyParser.json());

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const apolloServer = new ApolloServer({ schema });
  await apolloServer.start();

  app.use('/graphql', expressMiddleware(apolloServer, {
    context: async ({ req }) => {
      // Передаємо контекст з інформацією про користувача
      return getAuthContext(req as express.Request);
    },
  }));

  const port = process.env.PORT || 4000;
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  try {
    await mongoose.connect(mongoUri);
    console.log(' Connected to MongoDB');
  } catch (error) {
    console.error(' MongoDB connection error:', error);
    throw error;
  }

  app.listen(port, () => {
    console.log(`Server ready at http://localhost:${port}/graphql`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

