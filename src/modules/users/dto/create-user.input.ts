import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsEmailField } from '../../../common/validators/email.validator';
import { IsPasswordField } from '../../../common/validators/password.validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserInput {
  @ApiProperty({ example: 'jdoe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nickname!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'john.doe@aivacol.com' })
  @IsEmailField()
  email!: string;

  @ApiProperty({ example: 'SecurePass@2026' })
  @IsPasswordField()
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.Operator })
  @IsEnum(UserRole)
  role!: UserRole;
}
