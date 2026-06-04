import type { VehicleEventRoutingKey } from '../constants/vehicle-events.constants';
import type { VehicleResponseDto } from '../dto/vehicle-response.dto';

export interface VehicleEventMessage {
  eventType: VehicleEventRoutingKey;
  occurredAt: string;
  vehicle: VehicleResponseDto;
}
