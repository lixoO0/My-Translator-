import jwt from 'jsonwebtoken';
import { Request } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

export interface AuthContext {
  user?: {
    userId: string;
    email: string;
  };
}

export const getAuthContext = (req: Request): AuthContext => {
  try {
    // Отримуємо токен з заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {};
    }

    const token = authHeader.substring(7); // Видаляємо "Bearer "

    // Перевіряємо та декодуємо токен
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    return {
      user: {
        userId: decoded.userId,
        email: decoded.email,
      },
    };
  } catch (error) {
    // Якщо токен невалідний, повертаємо порожній контекст
    return {};
  }
};

