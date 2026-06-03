import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateUsersTable1748908800000 implements MigrationInterface {
  name = 'CreateUsersTable1748908800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
          },
          {
            name: 'nickname',
            type: 'nvarchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '255',
          },
          {
            name: 'email',
            type: 'nvarchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'nvarchar',
            length: '255',
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
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
      'users',
      new TableForeignKey({
        name: 'FK_users_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('users', 'FK_users_created_by');
    await queryRunner.dropTable('users');
  }
}
