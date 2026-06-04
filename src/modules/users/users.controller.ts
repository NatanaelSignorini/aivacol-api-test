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
import {
  ApiCreateErrorResponses,
  ApiDeleteErrorResponses,
  ApiFindOneErrorResponses,
  ApiListErrorResponses,
  ApiUpdateErrorResponses,
} from '../../common/swagger/api-responses';
import { UUID_V7_EXAMPLE } from '../../common/swagger/swagger.constants';
import { JWT_AUTH_SCHEME } from '../../config/swagger.config';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserResponseDto } from './dto/user-response.dto';
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
  create(
    @Body() input: CreateUserInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.create(input, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({ status: 200, type: UserResponseDto, isArray: true })
  @ApiListErrorResponses({ resource: 'users', protected: true })
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiFindOneErrorResponses({ resource: 'users', protected: true })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiUpdateErrorResponses({ resource: 'users', protected: true })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateUserInput,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove user (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiNoContentResponse({ description: 'User removed' })
  @ApiDeleteErrorResponses({ resource: 'users', protected: true })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.usersService.remove(id, user.id);
  }
}
