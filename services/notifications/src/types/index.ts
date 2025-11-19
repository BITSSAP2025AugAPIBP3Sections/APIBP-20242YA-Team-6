export interface Notification {
  id: string;
  recipientId: string;
  recipientEmail?: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}
