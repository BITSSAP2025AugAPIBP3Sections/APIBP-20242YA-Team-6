import jwt from 'jsonwebtoken';

export interface JWTPayload {
  id: number;
  email: string;
  role: string;
}

export const authenticateToken = (token?: string): JWTPayload | null => {
  if (!token) return null;

  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const decoded = jwt.verify(cleanToken, secret) as JWTPayload;
    
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
};

export const extractToken = (authHeader?: string): string | undefined => {
  if (!authHeader) return undefined;
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
};
