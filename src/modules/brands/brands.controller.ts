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
import { BrandsService } from './brands.service';
import { BrandResponseDto } from './dto/brand-response.dto';
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
  create(
    @Body() input: CreateBrandInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandResponseDto> {
    return this.brandsService.create(input, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all brands' })
  @ApiResponse({ status: 200, type: BrandResponseDto, isArray: true })
  @ApiListErrorResponses({ resource: 'brands' })
  findAll(): Promise<BrandResponseDto[]> {
    return this.brandsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by id' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  @ApiFindOneErrorResponses({ resource: 'brands' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BrandResponseDto> {
    return this.brandsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update brand' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiResponse({ status: 200, type: BrandResponseDto })
  @ApiUpdateErrorResponses({ resource: 'brands' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateBrandInput,
  ): Promise<BrandResponseDto> {
    return this.brandsService.update(id, input);
  }

  @Roles(UserRole.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove brand (admin only)' })
  @ApiParam({ name: 'id', format: 'uuid', example: UUID_V7_EXAMPLE })
  @ApiNoContentResponse({ description: 'Brand removed' })
  @ApiDeleteErrorResponses({ resource: 'brands', protected: true })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.brandsService.remove(id);
  }
}
