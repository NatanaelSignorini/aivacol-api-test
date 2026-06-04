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
import { CreateVehicleInput } from './dto/create-vehicle.input';
import { UpdateVehicleInput } from './dto/update-vehicle.input';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
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
  create(
    @Body() input: CreateVehicleInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiDataResponse<'vehicle', VehicleResponseDto>> {
    return this.vehiclesService
      .create(input, user.id)
      .then((vehicle) => buildItemDataResponse('vehicle', vehicle));
  }

  @Get()
  @ApiOperation({ summary: 'List vehicles with filters' })
  @ApiResponse({ status: 200, description: 'Paginated vehicles connection' })
  @ApiListErrorResponses({ resource: 'vehicles' })
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
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiDataResponse<'vehicle', VehicleResponseDto>> {
    return this.vehiclesService
      .findOne(id)
      .then((vehicle) => buildItemDataResponse('vehicle', vehicle));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: VehicleResponseDto })
  @ApiUpdateErrorResponses({ resource: 'vehicles' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateVehicleInput,
  ): Promise<ApiDataResponse<'vehicle', VehicleResponseDto>> {
    return this.vehiclesService
      .update(id, input)
      .then((vehicle) => buildItemDataResponse('vehicle', vehicle));
  }

  @Roles(UserRole.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove vehicle (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiNoContentResponse({ description: 'Vehicle removed' })
  @ApiDeleteErrorResponses({ resource: 'vehicles', protected: true })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehiclesService.remove(id);
  }
}
