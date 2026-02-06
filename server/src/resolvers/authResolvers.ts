import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { GraphQLError } from 'graphql';
import { OAuth2Client } from 'google-auth-library';

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}
if (!GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID is not set in environment variables');
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

interface LoginInput {
  emailOrUsername: string;
  password: string;
}

const buildBaseUsername = (name?: string | null, email?: string | null) => {
  const rawBase = (name && name.trim()) || (email ? email.split('@')[0] : 'user');
  const cleaned = rawBase.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  if (cleaned.length >= 3) {
    return cleaned.slice(0, 20);
  }
  return `user${crypto.randomBytes(4).toString('hex')}`;
};

const ensureUniqueUsername = async (base: string) => {
  let candidate = base;
  let suffix = 1;
  while (await User.findOne({ username: candidate })) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
};

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
      const { emailOrUsername, password } = input;

      // Знайти користувача за email або username
      const user = await User.findOne({
        $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
      });

      if (!user) {
        throw new GraphQLError('Invalid email/username or password', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Перевірка пароля
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new GraphQLError('Invalid email/username or password', {
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

    googleLogin: async (_: any, { token }: { token: string }) => {
      if (!token) {
        throw new GraphQLError('Google token is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      let email = '';
      let name = '';

      try {
        const tokenInfo = await googleClient.getTokenInfo(token);
        if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
          throw new Error('Invalid Google token audience');
        }

        googleClient.setCredentials({ access_token: token });
        const userInfoResponse = await googleClient.request({
          url: 'https://www.googleapis.com/oauth2/v3/userinfo',
        });
        const data = userInfoResponse.data as {
          email?: string;
          name?: string;
          picture?: string;
        };

        email = data.email || '';
        name = data.name || '';
      } catch (error) {
        throw new GraphQLError('Invalid Google token', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      if (!email) {
        throw new GraphQLError('Google account email not available', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      let user = await User.findOne({ email });

      if (!user) {
        const baseUsername = buildBaseUsername(name, email);
        const username = await ensureUniqueUsername(baseUsername);
        const randomPassword = crypto.randomBytes(24).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        user = new User({
          username,
          email,
          password: hashedPassword,
        });

        await user.save();
      }

      const userId = String(user._id);
      const authToken = jwt.sign({ userId, email: user.email }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return {
        token: authToken,
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

