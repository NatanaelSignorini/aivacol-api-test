import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Model } from '../models/entities/model.entity';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleEventsPublisher } from './publishers/vehicle-events.publisher';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Model])],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehicleEventsPublisher],
  exports: [VehiclesService],
})
export class VehiclesModule {}
