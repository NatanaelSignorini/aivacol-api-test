import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import type { ApiDataResponse } from '../../common/interfaces/connection.interface';
import {
  ERROR_RESPONSE_EXAMPLES,
  errorResponseSchema,
} from '../../common/swagger/error-response.examples';
import { buildItemDataResponse } from '../../common/utils/api-response.util';
import { JWT_AUTH_SCHEME } from '../../config/swagger.config';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { LoginResponseDto } from './dto/login-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: errorResponseSchema(ERROR_RESPONSE_EXAMPLES.loginUnauthorized),
  })
  login(
    @Body() input: LoginInput,
  ): Promise<ApiDataResponse<'login', LoginResponseDto>> {
    return this.authService
      .login(input)
      .then((response) => buildItemDataResponse('login', response));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth(JWT_AUTH_SCHEME)
  @ApiOperation({
    summary: 'End current session',
    description:
      'Confirms logout on the server. The client must discard access and refresh tokens.',
  })
  @ApiResponse({ status: 200, type: LogoutResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT',
    schema: errorResponseSchema(ERROR_RESPONSE_EXAMPLES.logoutUnauthorized),
  })
  logout(): ApiDataResponse<'logout', LogoutResponseDto> {
    return buildItemDataResponse('logout', this.authService.logout());
  }
}
