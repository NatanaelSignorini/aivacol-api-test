import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { ApiDataResponse } from '../../common/interfaces/connection.interface';
import {
  ApiCreateErrorResponses,
  ApiDeleteErrorResponses,
  ApiFindOneErrorResponses,
  ApiListErrorResponses,
  ApiUpdateErrorResponses,
} from '../../common/swagger/api-responses';
import { UUID_V7_EXAMPLE } from '../../common/swagger/swagger.constants';
import {
  buildItemDataResponse,
  buildListDataResponse,
} from '../../common/utils/api-response.util';
import { JWT_AUTH_SCHEME } from '../../config/swagger.config';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersListQueryDto } from './dto/users-list-query.dto';
import { UserRole } from './enums/user-role.enum';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth(JWT_AUTH_SCHEME)
@Roles(UserRole.Admin)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user (admin only)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiCreateErrorResponses({ resource: 'users', protected: true })
  /** POST /users — admin; cria usuário e retorna `{ data: { user } }`. */
  create(
    @Body() input: CreateUserInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiDataResponse<'user', UserResponseDto>> {
    return this.usersService
      .create(input, user.id)
      .then((userResponse) => buildItemDataResponse('user', userResponse));
  }

  @Get()
  @ApiOperation({ summary: 'List users with filters (admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated users connection' })
  @ApiListErrorResponses({ resource: 'users', protected: true })
  /** GET /users — admin; lista paginada com filtros; retorna `{ data: { users: connection } }`. */
  findAll(@Query() query: UsersListQueryDto) {
    return this.usersService
      .findAll(query)
      .then((connection) => buildListDataResponse('users', connection));
  }

  @Get('me')
  @Roles()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiFindOneErrorResponses({ resource: 'users', protected: true })
  /** GET /users/me — qualquer usuário autenticado; retorna perfil em `{ data: { user } }`. */
  me(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiDataResponse<'user', UserResponseDto>> {
    return this.usersService
      .findOne(user.id)
      .then((userResponse) => buildItemDataResponse('user', userResponse));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiFindOneErrorResponses({ resource: 'users', protected: true })
  /** GET /users/:id — admin; busca por UUID; retorna `{ data: { user } }`. */
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiDataResponse<'user', UserResponseDto>> {
    return this.usersService
      .findOne(id)
      .then((userResponse) => buildItemDataResponse('user', userResponse));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiUpdateErrorResponses({ resource: 'users', protected: true })
  /** PATCH /users/:id — admin; atualização parcial; retorna `{ data: { user } }`. */
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateUserInput,
  ): Promise<ApiDataResponse<'user', UserResponseDto>> {
    return this.usersService
      .update(id, input)
      .then((userResponse) => buildItemDataResponse('user', userResponse));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove user (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiNoContentResponse({ description: 'User removed' })
  @ApiDeleteErrorResponses({ resource: 'users', protected: true })
  /** DELETE /users/:id — admin; impede auto-exclusão (400); retorna 204. */
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.usersService.remove(id, user.id);
  }
}
