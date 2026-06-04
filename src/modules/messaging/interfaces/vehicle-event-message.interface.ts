import type { VehicleResponseDto } from '../../vehicles/dto/vehicle-response.dto';
import type { VehicleEventRoutingKey } from '../constants/vehicle-events.constants';

export interface VehicleEventMessage {
  eventType: VehicleEventRoutingKey;
  occurredAt: string;
  vehicle: VehicleResponseDto;
}
