import {
  buildItemDataResponse,
  buildListDataResponse,
  toConnection,
} from './api-response.util';

describe('api-response.util', () => {
  describe('toConnection', () => {
    it('indicates next and previous pages from skip and totalCount', () => {
      const connection = toConnection(['a', 'b'], 5, 2);

      expect(connection).toEqual({
        nodes: ['a', 'b'],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: true,
        },
        totalCount: 5,
      });
    });

    it('sets hasNextPage false on last page', () => {
      const connection = toConnection(['a'], 3, 2);

      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
    });

    it('sets hasPreviousPage false on first page', () => {
      const connection = toConnection([], 0, 0);

      expect(connection.pageInfo.hasPreviousPage).toBe(false);
      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.totalCount).toBe(0);
    });
  });

  describe('buildListDataResponse', () => {
    it('wraps connection under the given key', () => {
      const connection = toConnection([{ id: '1' }], 1, 0);
      const response = buildListDataResponse('vehicles', connection);

      expect(response).toEqual({ data: { vehicles: connection } });
    });
  });

  describe('buildItemDataResponse', () => {
    it('wraps item under the given key', () => {
      const item = { id: '1', name: 'Corolla' };
      const response = buildItemDataResponse('vehicle', item);

      expect(response).toEqual({ data: { vehicle: item } });
    });
  });
});
