import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateBrandsTable1748908800002 implements MigrationInterface {
  name = 'CreateBrandsTable1748908800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'brands',
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
            isUnique: true,
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
      'brands',
      new TableForeignKey({
        name: 'FK_brands_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('brands', 'FK_brands_created_by');
    await queryRunner.dropTable('brands');
  }
}
