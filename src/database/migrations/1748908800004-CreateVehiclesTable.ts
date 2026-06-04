import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateVehiclesTable1748908800004 implements MigrationInterface {
  name = 'CreateVehiclesTable1748908800004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vehicles',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
          },
          {
            name: 'license_plate',
            type: 'nvarchar',
            length: '10',
            isUnique: true,
          },
          {
            name: 'chassis',
            type: 'nvarchar',
            length: '17',
            isUnique: true,
          },
          {
            name: 'renavam',
            type: 'nvarchar',
            length: '11',
            isUnique: true,
          },
          {
            name: 'year',
            type: 'int',
          },
          {
            name: 'model_id',
            type: 'uniqueidentifier',
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETDATE()',
          },
          {
            name: 'updated_at',
            type: 'datetime2',
            default: 'GETDATE()',
          },
          {
            name: 'created_by',
            type: 'uniqueidentifier',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'vehicles',
      new TableIndex({
        name: 'UQ_vehicles_license_plate',
        columnNames: ['license_plate'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'vehicles',
      new TableIndex({
        name: 'UQ_vehicles_chassis',
        columnNames: ['chassis'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'vehicles',
      new TableIndex({
        name: 'UQ_vehicles_renavam',
        columnNames: ['renavam'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'vehicles',
      new TableForeignKey({
        name: 'FK_vehicles_model_id',
        columnNames: ['model_id'],
        referencedTableName: 'models',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createForeignKey(
      'vehicles',
      new TableForeignKey({
        name: 'FK_vehicles_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('vehicles', 'FK_vehicles_created_by');
    await queryRunner.dropForeignKey('vehicles', 'FK_vehicles_model_id');
    await queryRunner.dropIndex('vehicles', 'UQ_vehicles_renavam');
    await queryRunner.dropIndex('vehicles', 'UQ_vehicles_chassis');
    await queryRunner.dropIndex('vehicles', 'UQ_vehicles_license_plate');
    await queryRunner.dropTable('vehicles');
  }
}
