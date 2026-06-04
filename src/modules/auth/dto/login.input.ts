import { ApiProperty } from '@nestjs/swagger';
import { IsEmailField } from '../../../common/validators/email.validator';
import { IsPasswordField } from '../../../common/validators/password.validator';

export class LoginInput {
  @ApiProperty({ example: 'admin@aivacol.com' })
  @IsEmailField()
  email!: string;

  @ApiProperty({ example: 'Aivacol@2026' })
  @IsPasswordField()
  password!: string;
}
