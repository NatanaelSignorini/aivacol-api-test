import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from '../../bases/dto/base-response.dto';
import { UserRole } from '../enums/user-role.enum';

export class UserResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'aivacol' })
  nickname!: string;

  @ApiProperty({ example: 'Aivacol Admin' })
  name!: string;

  @ApiProperty({ example: 'admin@aivacol.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.Admin })
  role!: UserRole;
}
