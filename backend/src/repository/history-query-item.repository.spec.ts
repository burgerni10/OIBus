import SqliteDatabaseMock, { all, get, run } from '../tests/__mocks__/database.mock';
import { generateRandomId } from '../service/utils';
import { SouthConnectorItemCommandDTO, SouthConnectorItemDTO } from '../../../shared/model/south-connector.model';
import { Page } from '../../../shared/model/types';
import { Database } from 'better-sqlite3';
import HistoryQueryItemRepository from './history-query-item.repository';

jest.mock('../tests/__mocks__/database.mock');
jest.mock('../service/utils', () => ({
  generateRandomId: jest.fn(() => '123456')
}));

let database: Database;
let repository: HistoryQueryItemRepository;
describe('History query item repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    database = new SqliteDatabaseMock();
    database.prepare = jest.fn().mockReturnValue({
      run,
      get,
      all
    });
    repository = new HistoryQueryItemRepository(database);
  });

  it('should properly search history query items', () => {
    const expectedValue: Page<SouthConnectorItemDTO> = {
      content: [
        {
          id: 'id1',
          name: 'my history query item',
          enabled: true,
          connectorId: 'historyId',
          settings: {},
          scanModeId: 'history'
        },
        {
          id: 'id2',
          name: 'my second history query item',
          enabled: false,
          connectorId: 'historyId',
          settings: {},
          scanModeId: 'history'
        }
      ],
      size: 50,
      number: 0,
      totalElements: 2,
      totalPages: 1
    };
    all.mockReturnValueOnce([
      {
        id: 'id1',
        name: 'my history query item',
        enabled: true,
        historyId: 'historyId',
        settings: JSON.stringify({})
      },
      {
        id: 'id2',
        name: 'my second history query item',
        enabled: false,
        historyId: 'historyId',
        settings: JSON.stringify({})
      }
    ]);
    get.mockReturnValueOnce({ count: 2 });
    const southScans = repository.searchHistoryItems('historyId', {
      page: 0,
      name: 'my item'
    });
    expect(database.prepare).toHaveBeenCalledWith(
      'SELECT id, name, enabled, history_id AS historyId, settings FROM history_items WHERE ' +
        "history_id = ? AND name like '%' || ? || '%' LIMIT 50 OFFSET 0;"
    );
    expect(southScans).toEqual(expectedValue);
  });

  it('should properly get history query items by History query ID', () => {
    const expectedValue: Array<SouthConnectorItemDTO> = [
      {
        id: 'id1',
        name: 'my history query item',
        enabled: true,
        connectorId: 'historyId',
        settings: {},
        scanModeId: 'history'
      },
      {
        id: 'id2',
        name: 'my second history query item',
        enabled: false,
        connectorId: 'historyId',
        settings: {},
        scanModeId: 'history'
      }
    ];
    all.mockReturnValueOnce([
      {
        id: 'id1',
        name: 'my history query item',
        enabled: true,
        historyId: 'historyId',
        scanModeId: 'scanMode1',
        settings: JSON.stringify({})
      },
      {
        id: 'id2',
        name: 'my second history query item',
        enabled: false,
        historyId: 'historyId',
        scanModeId: 'scan1',
        settings: JSON.stringify({})
      }
    ]);
    const southScans = repository.getHistoryItems('historyId');
    expect(database.prepare).toHaveBeenCalledWith('SELECT id, name, enabled, settings FROM history_items WHERE history_id = ?;');
    expect(southScans).toEqual(expectedValue);
  });

  it('should properly get a history query item', () => {
    const expectedValue: SouthConnectorItemDTO = {
      id: 'id1',
      name: 'historyItem1',
      enabled: true,
      connectorId: 'historyId',
      settings: {},
      scanModeId: 'history'
    };
    get.mockReturnValueOnce({
      id: 'id1',
      name: 'historyItem1',
      enabled: true,
      historyId: 'historyId',
      settings: JSON.stringify({})
    });
    const southScan = repository.getHistoryItem('id1');
    expect(database.prepare).toHaveBeenCalledWith(
      'SELECT id, name, enabled, history_id AS historyId, settings FROM history_items WHERE id = ?;'
    );
    expect(get).toHaveBeenCalledWith('id1');
    expect(southScan).toEqual(expectedValue);
  });

  it('should create a history query item', () => {
    run.mockReturnValueOnce({ lastInsertRowid: 1 });
    get.mockReturnValueOnce({ settings: '{}' });

    const command: SouthConnectorItemCommandDTO = {
      name: 'historyItem1',
      enabled: true,
      scanModeId: 'history',
      settings: {}
    };
    repository.createHistoryItem('historyId', command);
    expect(generateRandomId).toHaveBeenCalledWith(6);
    expect(database.prepare).toHaveBeenCalledWith(
      'INSERT INTO history_items (id, name, enabled, history_id, settings) VALUES (?, ?, ?, ?, ?);'
    );
    expect(run).toHaveBeenCalledWith('123456', command.name, 1, 'historyId', JSON.stringify(command.settings));
    expect(get).toHaveBeenCalledWith(1);

    expect(database.prepare).toHaveBeenCalledWith(
      'SELECT id, name, enabled, history_id AS historyId, settings FROM history_items WHERE ROWID = ?;'
    );
  });

  it('should update a history query item', () => {
    const command: SouthConnectorItemCommandDTO = {
      name: 'historyItem1',
      enabled: false,
      scanModeId: 'history',
      settings: {}
    };
    repository.updateHistoryItem('id1', command);
    expect(database.prepare).toHaveBeenCalledWith('UPDATE history_items SET name = ?, enabled = ?, settings = ? WHERE id = ?;');
    expect(run).toHaveBeenCalledWith(command.name, 0, JSON.stringify(command.settings), 'id1');
  });

  it('should delete a history query item', () => {
    repository.deleteHistoryItem('id1');
    expect(database.prepare).toHaveBeenCalledWith('DELETE FROM history_items WHERE id = ?;');
    expect(run).toHaveBeenCalledWith('id1');
  });

  it('should delete all history query items associated to a history id', () => {
    repository.deleteAllItems('historyId');
    expect(database.prepare).toHaveBeenCalledWith('DELETE FROM history_items WHERE history_id = ?;');
    expect(run).toHaveBeenCalledWith('historyId');
  });

  it('should create and update items', () => {
    (database.transaction as jest.Mock).mockImplementationOnce(callback => {
      return () => callback();
    });
    const itemToAdd: SouthConnectorItemDTO = {
      id: 'id1',
      name: 'item1',
      enabled: true,
      connectorId: 'southId',
      settings: {},
      scanModeId: 'history'
    };

    const itemToUpdate: SouthConnectorItemDTO = {
      id: 'id2',
      name: 'item2',
      enabled: true,
      connectorId: 'southId',
      settings: {},
      scanModeId: 'history'
    };

    repository.createAndUpdateItems('historyId', [itemToAdd], [itemToUpdate]);
    expect(database.prepare).toHaveBeenCalledWith(
      `INSERT INTO history_items (id, name, enabled, history_id, settings) VALUES (?, ?, ?, ?, ?);`
    );
    expect(database.prepare).toHaveBeenCalledWith(`UPDATE history_items SET name = ?, settings = ? WHERE id = ?;`);
    expect(run).toHaveBeenCalledWith('123456', 'item1', 1, 'historyId', '{}');
    expect(run).toHaveBeenCalledWith('item2', '{}', 'id2');
  });

  it('should enable history item', () => {
    repository.enableHistoryItem('id1');
    expect(database.prepare).toHaveBeenCalledWith('UPDATE history_items SET enabled = 1 WHERE id = ?;');
    expect(run).toHaveBeenCalledWith('id1');
  });

  it('should disable history item', () => {
    repository.disableHistoryItem('id1');
    expect(database.prepare).toHaveBeenCalledWith('UPDATE history_items SET enabled = 0 WHERE id = ?;');
    expect(run).toHaveBeenCalledWith('id1');
  });
});
