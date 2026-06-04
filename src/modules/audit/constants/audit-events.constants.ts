export const AUDIT_EVENTS_EXCHANGE_DEFAULT = 'aivacol.audit';

export const AUDIT_EVENTS_QUEUE_DEFAULT = 'aivacol.audit.interactions';

export const AuditEventRoutingKey = {
  InteractionRecord: 'interaction.record',
} as const;

export type AuditEventRoutingKey =
  (typeof AuditEventRoutingKey)[keyof typeof AuditEventRoutingKey];
