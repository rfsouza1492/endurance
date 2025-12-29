export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface MagicLinkToken {
  email: string;
  token: string;
  expiresAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

