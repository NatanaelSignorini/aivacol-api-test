import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ParseUuidV7Pipe } from '../../common/pipes/parse-uuid-v7.pipe';
import type { EntityId } from '../../common/types/entity-id.type';
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
import { CreateVehicleInput } from './dto/create-vehicle.input';
import { UpdateVehicleInput } from './dto/update-vehicle.input';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { VehiclesIncludeQueryDto } from './dto/vehicles-include-query.dto';
import { VehiclesListQueryDto } from './dto/vehicles-list-query.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicles')
@ApiBearerAuth(JWT_AUTH_SCHEME)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register vehicle' })
  @ApiResponse({ status: 201, type: VehicleResponseDto })
  @ApiCreateErrorResponses({ resource: 'vehicles' })
  /** POST /vehicles — exige JWT; registra veículo e retorna `{ data: { vehicle } }`. */
  create(
    @Body() input: CreateVehicleInput,
    @Query() includeQuery: VehiclesIncludeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiDataResponse<'vehicle', VehicleResponseDto>> {
    return this.vehiclesService
      .create(input, user.id, includeQuery)
      .then((vehicle) => buildItemDataResponse('vehicle', vehicle));
  }

  @Get()
  @ApiOperation({ summary: 'List vehicles with filters' })
  @ApiResponse({ status: 200, description: 'Paginated vehicles connection' })
  @ApiListErrorResponses({ resource: 'vehicles' })
  /** GET /vehicles — lista paginada com filtros; usa cache Redis na consulta padrão. */
  findAll(@Query() query: VehiclesListQueryDto) {
    return this.vehiclesService
      .findAll(query)
      .then((connection) => buildListDataResponse('vehicles', connection));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by id' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: VehicleResponseDto })
  @ApiFindOneErrorResponses({ resource: 'vehicles' })
  /** GET /vehicles/:id — busca por UUID com includes opcionais; retorna `{ data: { vehicle } }`. */
  findOne(
    @Param('id', ParseUuidV7Pipe) id: EntityId,
    @Query() includeQuery: VehiclesIncludeQueryDto,
  ): Promise<ApiDataResponse<'vehicle', VehicleResponseDto>> {
    return this.vehiclesService
      .findOne(id, includeQuery)
      .then((vehicle) => buildItemDataResponse('vehicle', vehicle));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: VehicleResponseDto })
  @ApiUpdateErrorResponses({ resource: 'vehicles' })
  /** PATCH /vehicles/:id — atualização parcial; invalida cache e publica evento. */
  update(
    @Param('id', ParseUuidV7Pipe) id: EntityId,
    @Body() input: UpdateVehicleInput,
    @Query() includeQuery: VehiclesIncludeQueryDto,
  ): Promise<ApiDataResponse<'vehicle', VehicleResponseDto>> {
    return this.vehiclesService
      .update(id, input, includeQuery)
      .then((vehicle) => buildItemDataResponse('vehicle', vehicle));
  }

  @Roles(UserRole.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove vehicle (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiNoContentResponse({ description: 'Vehicle removed' })
  @ApiDeleteErrorResponses({ resource: 'vehicles', protected: true })
  /** DELETE /vehicles/:id — admin; remove veículo, invalida cache e publica evento; retorna 204. */
  remove(@Param('id', ParseUuidV7Pipe) id: EntityId): Promise<void> {
    return this.vehiclesService.remove(id);
  }
}
