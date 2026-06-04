import { Module } from '@nestjs/common';
import { VehicleEventsPublisher } from './publishers/vehicle-events.publisher';

@Module({
  providers: [VehicleEventsPublisher],
  exports: [VehicleEventsPublisher],
})
export class MessagingModule {}
