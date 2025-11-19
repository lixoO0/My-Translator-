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

const resolvers = {
  Query: {
    _health: () => 'ok',
    ...authResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
  },
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const apolloServer = new ApolloServer({ schema });
  await apolloServer.start();

  app.use('/graphql', expressMiddleware(apolloServer));

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

