export class LoginResponseDto {
  accessToken!: string;
  refreshToken!: string;
  tokenType!: string;
  expiresIn!: number;
}
