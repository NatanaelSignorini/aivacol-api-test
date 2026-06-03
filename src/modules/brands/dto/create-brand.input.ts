import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBrandInput {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}
