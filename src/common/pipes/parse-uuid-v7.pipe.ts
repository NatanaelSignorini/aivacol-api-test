import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { EntityId } from '../types/entity-id.type';
import { isUuidV7 } from '../types/entity-id.type';

@Injectable()
export class ParseUuidV7Pipe implements PipeTransform<string, EntityId> {
  transform(value: string): EntityId {
    if (!isUuidV7(value)) {
      throw new BadRequestException('Validation failed (uuid v7 is expected)');
    }

    return value;
  }
}
