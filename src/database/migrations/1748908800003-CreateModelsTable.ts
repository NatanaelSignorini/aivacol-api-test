import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateModelsTable1748908800003 implements MigrationInterface {
  name = 'CreateModelsTable1748908800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'models',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '255',
          },
          {
            name: 'brand_id',
            type: 'uniqueidentifier',
            isNullable: false,
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

    await queryRunner.createForeignKey(
      'models',
      new TableForeignKey({
        name: 'FK_models_brand_id',
        columnNames: ['brand_id'],
        referencedTableName: 'brands',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createForeignKey(
      'models',
      new TableForeignKey({
        name: 'FK_models_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('models', 'FK_models_created_by');
    await queryRunner.dropForeignKey('models', 'FK_models_brand_id');
    await queryRunner.dropTable('models');
  }
}
