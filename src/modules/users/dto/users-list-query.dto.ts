import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UserRole } from '../enums/user-role.enum';

export class UsersListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'ana@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Ana Luiza' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'analuz' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.Operator })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
