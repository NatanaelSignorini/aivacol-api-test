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
import { BrandsService } from './brands.service';
import { BrandResponseDto } from './dto/brand-response.dto';
import { BrandsListQueryDto } from './dto/brands-list-query.dto';
import { CreateBrandInput } from './dto/create-brand.input';
import { UpdateBrandInput } from './dto/update-brand.input';

@ApiTags('Brands')
@ApiBearerAuth(JWT_AUTH_SCHEME)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create brand' })
  @ApiResponse({ status: 201, type: BrandResponseDto })
  @ApiCreateErrorResponses({ resource: 'brands' })
  /** POST /brands — exige JWT; cria marca e retorna `{ data: { brand } }`. */
  create(
    @Body() input: CreateBrandInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiDataResponse<'brand', BrandResponseDto>> {
    return this.brandsService
      .create(input, user.id)
      .then((brand) => buildItemDataResponse('brand', brand));
  }

  @Get()
  @ApiOperation({ summary: 'List brands with filters' })
  @ApiResponse({ status: 200, description: 'Paginated brands connection' })
  @ApiListErrorResponses({ resource: 'brands' })
  /** GET /brands — lista paginada com filtros; retorna `{ data: { brands: connection } }`. */
  findAll(@Query() query: BrandsListQueryDto) {
    return this.brandsService
      .findAll(query)
      .then((connection) => buildListDataResponse('brands', connection));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by id' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  @ApiFindOneErrorResponses({ resource: 'brands' })
  /** GET /brands/:id — busca por UUID; retorna `{ data: { brand } }`. */
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiDataResponse<'brand', BrandResponseDto>> {
    return this.brandsService
      .findOne(id)
      .then((brand) => buildItemDataResponse('brand', brand));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update brand' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  @ApiUpdateErrorResponses({ resource: 'brands' })
  /** PATCH /brands/:id — atualização parcial; retorna `{ data: { brand } }`. */
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateBrandInput,
  ): Promise<ApiDataResponse<'brand', BrandResponseDto>> {
    return this.brandsService
      .update(id, input)
      .then((brand) => buildItemDataResponse('brand', brand));
  }

  @Roles(UserRole.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove brand (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiNoContentResponse({ description: 'Brand removed' })
  @ApiDeleteErrorResponses({ resource: 'brands', protected: true })
  /** DELETE /brands/:id — admin; bloqueado se houver models (409); retorna 204. */
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.brandsService.remove(id);
  }
}
