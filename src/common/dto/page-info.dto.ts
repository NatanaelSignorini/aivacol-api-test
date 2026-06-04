import { ApiProperty } from '@nestjs/swagger';

export class PageInfoDto {
  @ApiProperty({ example: false })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}
