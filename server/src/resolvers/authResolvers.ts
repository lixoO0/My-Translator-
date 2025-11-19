import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { GraphQLError } from 'graphql';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export const authResolvers = {
  Mutation: {
    register: async (_: any, { input }: { input: RegisterInput }) => {
      const { username, email, password } = input;

      // Перевірка чи існує користувач з таким email або username
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new GraphQLError('User with this email already exists', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        if (existingUser.username === username) {
          throw new GraphQLError('User with this username already exists', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      // Хешування пароля
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Створення нового користувача
      const user = new User({
        username,
        email,
        password: hashedPassword,
      });

      await user.save();

      // Створення JWT токена
      const userId = String(user._id);
      const token = jwt.sign(
        { userId, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: userId,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
      };
    },

    login: async (_: any, { input }: { input: LoginInput }) => {
      const { email, password } = input;

      // Знайти користувача за email
      const user = await User.findOne({ email });

      if (!user) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Перевірка пароля
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Створення JWT токена
      const userId = String(user._id);
      const token = jwt.sign(
        { userId, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: userId,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
      };
    },
  },

  Query: {
    me: async (_: any, __: any, context: any) => {
      // TODO: Додати middleware для перевірки токена
      // Зараз просто повертаємо null
      return null;
    },
  },
};

