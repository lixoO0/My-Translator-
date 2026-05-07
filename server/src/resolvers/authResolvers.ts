import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { GraphQLError } from 'graphql';
import { OAuth2Client } from 'google-auth-library';
import { sendVerificationEmail } from '../services/emailService';

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

const OTP_TTL_MS = 15 * 60 * 1000;

export const authResolvers = {
  Mutation: {
    register: async (_: any, args: { input: RegisterInput }) => {
      console.log('=== РЕЄСТРАЦІЯ ПОЧАЛАСЯ ===, email:', args.input?.email);
      const { input } = args;
      const { username, email, password } = input;
      const normalizedEmail = email.trim().toLowerCase();

      // Перевірка чи існує користувач з таким email або username
      const existingUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { username }],
      });

      if (existingUser) {
        if (existingUser.email === normalizedEmail) {
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

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date(Date.now() + OTP_TTL_MS);

      // Створення нового користувача
      const user = new User({
        username,
        email: normalizedEmail,
        password: hashedPassword,
        isVerified: false,
        verificationCode,
        verificationCodeExpires,
      });

      await user.save();

      try {
        await sendVerificationEmail(user.email, verificationCode);
      } catch (err) {
        await User.deleteOne({ _id: user._id });
        throw new GraphQLError('Не вдалося надіслати код. Спробуйте пізніше.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      console.log('=== РЕЄСТРАЦІЯ УСПІШНА ===');
      return { message: 'Код верифікації надіслано на вашу пошту' };
    },

    verifyEmail: async (_: any, { email, code }: { email: string; code: string }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const safeCode = String(code || '').replace(/[^\d]/g, '').slice(0, 6);

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (user.isVerified) {
        throw new GraphQLError('Email already verified', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (!user.verificationCode || user.verificationCode !== safeCode) {
        throw new GraphQLError('Невірний код', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (user.verificationCodeExpires && user.verificationCodeExpires.getTime() < Date.now()) {
        throw new GraphQLError('Код застарів. Будь ласка, запитайте новий', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      user.isVerified = true;
      user.verificationCode = null;
      user.verificationCodeExpires = null;
      await user.save();

      const userId = String(user._id);
      const token = jwt.sign({ userId, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

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

    resendVerificationCode: async (_: any, { email }: { email: string }) => {
      const normalizedEmail = email.trim().toLowerCase();

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (user.isVerified) {
        throw new GraphQLError('Email already verified', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date(Date.now() + OTP_TTL_MS);

      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      await user.save();

      try {
        await sendVerificationEmail(user.email, verificationCode);
      } catch (err) {
        throw new GraphQLError('Не вдалося надіслати код. Спробуйте пізніше.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      return { message: 'Новий код надіслано' };
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

      if (!user.isVerified) {
        throw new GraphQLError('Будь ласка, підтвердіть пошту', {
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
          isVerified: true,
          verificationCode: null,
          verificationCodeExpires: null,
        });

        await user.save();
      } else if (!user.isVerified) {
        user.isVerified = true;
        user.verificationCode = null;
        user.verificationCodeExpires = null;
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

