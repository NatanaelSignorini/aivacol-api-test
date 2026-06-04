import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsEmailField } from '../../../common/validators/email.validator';
import { IsPasswordField } from '../../../common/validators/password.validator';
import { UserRole } from '../enums/user-role.enum';

export class UpdateUserInput {
  @ApiPropertyOptional({ example: 'jdoe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nickname?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'john.doe@aivacol.com' })
  @IsOptional()
  @IsEmailField()
  email?: string;

  @ApiPropertyOptional({ example: 'NewSecurePass@2026' })
  @IsOptional()
  @IsPasswordField()
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.Operator })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
