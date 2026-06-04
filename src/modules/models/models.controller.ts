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
import { UserRole } from '../users/enums/user-role.enum';
import { CreateModelInput } from './dto/create-model.input';
import { ModelResponseDto } from './dto/model-response.dto';
import { UpdateModelInput } from './dto/update-model.input';
import { ModelsService } from './models.service';

@ApiTags('Models')
@ApiBearerAuth(JWT_AUTH_SCHEME)
@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create model' })
  @ApiResponse({ status: 201, type: ModelResponseDto })
  @ApiCreateErrorResponses({ resource: 'models' })
  create(
    @Body() input: CreateModelInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ModelResponseDto> {
    return this.modelsService.create(input, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all models' })
  @ApiResponse({ status: 200, type: ModelResponseDto, isArray: true })
  @ApiListErrorResponses({ resource: 'models' })
  findAll(): Promise<ModelResponseDto[]> {
    return this.modelsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get model by id' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: ModelResponseDto })
  @ApiFindOneErrorResponses({ resource: 'models' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ModelResponseDto> {
    return this.modelsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update model' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: ModelResponseDto })
  @ApiUpdateErrorResponses({ resource: 'models' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateModelInput,
  ): Promise<ModelResponseDto> {
    return this.modelsService.update(id, input);
  }

  @Roles(UserRole.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove model (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiNoContentResponse({ description: 'Model removed' })
  @ApiDeleteErrorResponses({ resource: 'models', protected: true })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.modelsService.remove(id);
  }
}
