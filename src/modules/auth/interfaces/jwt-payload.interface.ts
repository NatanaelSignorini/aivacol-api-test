export interface JwtPayload {
  sub: number;
  nickname: string;
}

export interface AuthenticatedUser {
  id: number;
  nickname: string;
}
