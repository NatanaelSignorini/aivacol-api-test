import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { IsEmailField } from '../../../common/validators/email.validator';
import { IsPasswordField } from '../../../common/validators/password.validator';

export class LoginInput {
  @ValidateIf((o: LoginInput) => !o.document)
  @IsEmailField()
  email?: string;

  @ValidateIf((o: LoginInput) => !o.email)
  @IsString()
  @IsNotEmpty({ message: 'email or document is required' })
  document?: string;

  @IsPasswordField()
  password!: string;
}
