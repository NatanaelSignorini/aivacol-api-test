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
import { UserRole } from '../users/enums/user-role.enum';
import { CreateModelInput } from './dto/create-model.input';
import { ModelResponseDto } from './dto/model-response.dto';
import { ModelsIncludeQueryDto } from './dto/models-include-query.dto';
import { ModelsListQueryDto } from './dto/models-list-query.dto';
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
  /** POST /models — exige JWT e brandId; suporta includes via query; retorna `{ data: { model } }`. */
  create(
    @Body() input: CreateModelInput,
    @Query() includeQuery: ModelsIncludeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiDataResponse<'model', ModelResponseDto>> {
    return this.modelsService
      .create(input, user.id, includeQuery)
      .then((model) => buildItemDataResponse('model', model));
  }

  @Get()
  @ApiOperation({ summary: 'List models with filters' })
  @ApiResponse({ status: 200, description: 'Paginated models connection' })
  @ApiListErrorResponses({ resource: 'models' })
  /** GET /models — lista paginada com filtros e includes; retorna `{ data: { models: connection } }`. */
  findAll(@Query() query: ModelsListQueryDto) {
    return this.modelsService
      .findAll(query)
      .then((connection) => buildListDataResponse('models', connection));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get model by id' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: ModelResponseDto })
  @ApiFindOneErrorResponses({ resource: 'models' })
  /** GET /models/:id — busca por UUID com includes opcionais; retorna `{ data: { model } }`. */
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() includeQuery: ModelsIncludeQueryDto,
  ): Promise<ApiDataResponse<'model', ModelResponseDto>> {
    return this.modelsService
      .findOne(id, includeQuery)
      .then((model) => buildItemDataResponse('model', model));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update model' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: ModelResponseDto })
  @ApiUpdateErrorResponses({ resource: 'models' })
  /** PATCH /models/:id — atualização parcial; retorna `{ data: { model } }`. */
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateModelInput,
    @Query() includeQuery: ModelsIncludeQueryDto,
  ): Promise<ApiDataResponse<'model', ModelResponseDto>> {
    return this.modelsService
      .update(id, input, includeQuery)
      .then((model) => buildItemDataResponse('model', model));
  }

  @Roles(UserRole.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove model (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiNoContentResponse({ description: 'Model removed' })
  @ApiDeleteErrorResponses({ resource: 'models', protected: true })
  /** DELETE /models/:id — admin; bloqueado se houver veículos (409); retorna 204. */
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.modelsService.remove(id);
  }
}
