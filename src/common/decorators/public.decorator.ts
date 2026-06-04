import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca rota como pública; JwtAuthGuard e RolesGuard ignoram autenticação/autorização. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
