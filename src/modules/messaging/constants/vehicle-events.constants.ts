export const VEHICLE_EVENTS_EXCHANGE_DEFAULT = 'aivacol.vehicles';

export const VehicleEventRoutingKey = {
  Created: 'vehicle.created',
  Updated: 'vehicle.updated',
  Deleted: 'vehicle.deleted',
} as const;

export type VehicleEventRoutingKey =
  (typeof VehicleEventRoutingKey)[keyof typeof VehicleEventRoutingKey];
