import fs from 'node:fs/promises';
import path from 'node:path';

import SouthFolderScanner from './south-folder-scanner';

import { compress } from '../../service/utils';
import pino from 'pino';
import PinoLogger from '../../tests/__mocks__/logger.mock';
import DatabaseMock from '../../tests/__mocks__/database.mock';
import EncryptionService from '../../service/encryption.service';
import EncryptionServiceMock from '../../tests/__mocks__/encryption-service.mock';
import RepositoryService from '../../service/repository.service';
import RepositoryServiceMock from '../../tests/__mocks__/repository-service.mock';

import { SouthConnectorDTO, SouthConnectorItemDTO } from '../../../../shared/model/south-connector.model';
import { SouthFolderScannerItemSettings, SouthFolderScannerSettings } from '../../../../shared/model/south-settings.model';

jest.mock('node:fs/promises');
jest.mock('../../service/utils');
const database = new DatabaseMock();
const getQueryOnCustomTable = jest.fn();
const runQueryOnCustomTable = jest.fn();
jest.mock(
  '../../service/south-cache.service',
  () =>
    function () {
      return {
        cacheRepository: {
          createCustomTable: jest.fn(),
          runQueryOnCustomTable,
          getQueryOnCustomTable
        }
      };
    }
);
jest.mock(
  '../../service/south-connector-metrics.service',
  () =>
    function () {
      return {
        initMetrics: jest.fn(),
        updateMetrics: jest.fn(),
        get stream() {
          return { stream: 'myStream' };
        },
        metrics: {
          numberOfValuesRetrieved: 1,
          numberOfFilesRetrieved: 1
        }
      };
    }
);

const addValues = jest.fn();
const addFile = jest.fn();

const logger: pino.Logger = new PinoLogger();

const encryptionService: EncryptionService = new EncryptionServiceMock('', '');
const repositoryService: RepositoryService = new RepositoryServiceMock();

const items: Array<SouthConnectorItemDTO<SouthFolderScannerItemSettings>> = [
  {
    id: 'id1',
    name: 'item1',
    enabled: true,
    connectorId: 'southId',
    settings: {
      regex: '.*.csv'
    },
    scanModeId: 'scanModeId1'
  },
  {
    id: 'id2',
    name: 'item2',
    enabled: true,
    connectorId: 'southId',
    settings: {
      regex: '.*.log'
    },
    scanModeId: 'scanModeId1'
  },
  {
    id: 'id2',
    name: 'item2',
    enabled: true,
    connectorId: 'southId',
    settings: {
      regex: '.*.txt'
    },
    scanModeId: 'scanModeId1'
  }
];

const nowDateString = '2020-02-02T02:02:02.222Z';
let south: SouthFolderScanner;
const configuration: SouthConnectorDTO<SouthFolderScannerSettings> = {
  id: 'southId',
  name: 'south',
  type: 'test',
  description: 'my test connector',
  enabled: true,
  history: {
    maxInstantPerItem: true,
    maxReadInterval: 3600,
    readDelay: 0
  },
  settings: {
    inputFolder: 'inputFolder',
    preserveFiles: false,
    ignoreModifiedDate: false,
    minAge: 1000,
    compression: false
  }
};

describe('SouthFolderScanner', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(nowDateString));

    south = new SouthFolderScanner(configuration, items, addValues, addFile, encryptionService, repositoryService, logger, 'baseFolder');
  });

  it('fileQuery should manage file query', async () => {
    expect(database.prepare).not.toHaveBeenCalled();
    (fs.readdir as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve([]))
      .mockImplementationOnce(() => Promise.resolve(['file.txt', 'file2.txt', 'file3.txt', 'file.log']));

    south.sendFile = jest.fn();
    south.checkAge = jest
      .fn()
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => true)
      .mockImplementationOnce(() => true);

    await south.fileQuery(items);

    expect(logger.trace).toHaveBeenCalledWith(`Reading "${path.resolve(configuration.settings.inputFolder)}" directory`);
    expect(fs.readdir).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(`The folder "${path.resolve(configuration.settings.inputFolder)}" is empty`);

    await south.fileQuery(items);
    expect(logger.trace).toHaveBeenCalledWith(`Filtering with regex "${items[0].settings.regex}"`);
    expect(logger.debug).toHaveBeenCalledWith(
      `No file in "${path.resolve(configuration.settings.inputFolder)}" matches regex "${items[0].settings.regex}"`
    );

    expect(logger.trace).toHaveBeenCalledWith(`Filtering with regex "${items[1].settings.regex}"`);
    expect(logger.trace).toHaveBeenCalledWith(`1 files matching regex "${items[1].settings.regex}"`);
    expect(logger.debug).toHaveBeenCalledWith(`No file matches minimum age with regex "${items[1].settings.regex}"`);

    expect(logger.trace).toHaveBeenCalledWith(`Filtering with regex "${items[2].settings.regex}"`);
    expect(logger.trace).toHaveBeenCalledWith(`Sending 2 files`);
    expect(south.sendFile).toHaveBeenCalledTimes(2);
    expect(south.sendFile).toHaveBeenCalledWith('file2.txt');
    expect(south.sendFile).toHaveBeenCalledWith('file3.txt');
  });

  it('should properly check age', async () => {
    const mtimeMs = new Date('2020-02-02T02:02:02.222Z').getTime();
    const timestamp = new Date().getTime();
    (fs.stat as jest.Mock).mockImplementationOnce(() => ({ mtimeMs })).mockImplementationOnce(() => ({ mtimeMs: mtimeMs - 10000 }));

    expect(await south.checkAge('myFile')).toEqual(false);
    expect(logger.trace).toHaveBeenCalledWith(
      `Check age condition: mT:${mtimeMs} + mA ${configuration.settings.minAge} < ts:${timestamp} ` +
        `= ${mtimeMs + configuration.settings.minAge < timestamp}`
    );

    expect(await south.checkAge('myFile')).toEqual(true);
    expect(logger.trace).toHaveBeenCalledWith('File "myFile" matches age');
  });

  it('should properly send file', async () => {
    south.addFile = jest.fn();
    south.updateModifiedTime = jest.fn();
    (fs.unlink as jest.Mock)
      .mockImplementationOnce(() => null)
      .mockImplementationOnce(() => {
        throw new Error('error');
      });
    await south.sendFile('myFile1');

    expect(south.addFile).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(`Sending file "${path.resolve(configuration.settings.inputFolder, 'myFile1')}" to the engine`);
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(south.updateModifiedTime).not.toHaveBeenCalled();

    await south.sendFile('myFile2');
    expect(logger.info).toHaveBeenCalledWith(`Sending file "${path.resolve(configuration.settings.inputFolder, 'myFile2')}" to the engine`);
    expect(fs.unlink).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      `Error while removing "${path.resolve(configuration.settings.inputFolder, 'myFile2')}": ${new Error('error')}`
    );
  });

  it('should get modified time', () => {
    getQueryOnCustomTable.mockReturnValueOnce({ mtimeMs: 1 }).mockReturnValueOnce(null);
    expect(south.getModifiedTime('my file')).toEqual(1);
    expect(south.getModifiedTime('my file')).toEqual(0);
    expect(getQueryOnCustomTable).toHaveBeenCalledWith(
      `SELECT mtime_ms AS mtimeMs FROM "folder_scanner_${configuration.id}" WHERE filename = ?`,
      ['my file']
    );
  });

  it('should update modified time', () => {
    south.updateModifiedTime('my file', 1);
    expect(runQueryOnCustomTable).toHaveBeenCalledWith(
      `INSERT INTO "folder_scanner_${configuration.id}" (filename, mtime_ms) VALUES (?, ?) ON CONFLICT(filename) DO UPDATE SET mtime_ms = ?`,
      ['my file', 1, 1]
    );
  });
});

describe('SouthFolderScanner with preserve file and compression', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(nowDateString));
    database.prepare.mockImplementation(() => ({
      run: jest.fn()
    }));
    configuration.settings.compression = true;
    configuration.settings.preserveFiles = true;
    south = new SouthFolderScanner(configuration, items, addValues, addFile, encryptionService, repositoryService, logger, 'baseFolder');
    await south.start();
  });

  it('should properly check age', async () => {
    const mtimeMs = new Date('2020-02-02T02:02:02.222Z').getTime();
    (fs.stat as jest.Mock).mockImplementation(() => ({ mtimeMs: mtimeMs - 10000 }));
    south.getModifiedTime = jest
      .fn()
      .mockReturnValueOnce(mtimeMs - 10000) // saved modified time same than mTime (mtimeMs - 10000) => file did not change
      .mockReturnValueOnce(mtimeMs - 999999); // saved modified time is more recent than mTime (mtimeMs - 999999) => file changed
    expect(await south.checkAge('myFile1')).toEqual(false);
    expect(await south.checkAge('myFile2')).toEqual(true);
    expect(logger.trace).toHaveBeenCalledWith(
      `File "myFile2" last modified time ${mtimeMs - 999999} is older than mtimeMs ${mtimeMs - 10000}. The file will be sent`
    );
  });

  it('should properly send compressed file', async () => {
    const mtimeMs = new Date('2020-02-02T02:02:02.222Z').getTime();

    south.addFile = jest.fn();
    south.updateModifiedTime = jest.fn();
    (fs.unlink as jest.Mock)
      .mockImplementationOnce(() => null)
      .mockImplementationOnce(() => {
        throw new Error('error');
      });
    (fs.stat as jest.Mock).mockImplementation(() => ({ mtimeMs }));
    await south.sendFile('myFile1');

    expect(logger.info).toHaveBeenCalledWith(`Sending file "${path.resolve(configuration.settings.inputFolder, 'myFile1')}" to the engine`);
    expect(compress).toHaveBeenCalledWith(
      path.resolve(configuration.settings.inputFolder, 'myFile1'),
      `${path.resolve('baseFolder', 'tmp', 'myFile1')}.gz`
    );
    expect(south.addFile).toHaveBeenCalledWith(`${path.resolve('baseFolder', 'tmp', 'myFile1')}.gz`);
    expect(fs.unlink).toHaveBeenCalledWith(`${path.resolve('baseFolder', 'tmp', 'myFile1')}.gz`);
    expect(logger.error).not.toHaveBeenCalled();
    expect(south.updateModifiedTime).toHaveBeenCalledWith('myFile1', mtimeMs);

    await south.sendFile('myFile2');
    expect(logger.error).toHaveBeenCalledWith(
      `Error while removing compressed file "${path.resolve('baseFolder', 'tmp', 'myFile2')}.gz": ${new Error('error')}`
    );

    (compress as jest.Mock).mockImplementationOnce(() => {
      throw new Error('compression error');
    });
    await south.sendFile('myFile2');
    expect(logger.error).toHaveBeenCalledWith(
      `Error compressing file "${path.resolve(configuration.settings.inputFolder, 'myFile2')}". Sending it raw instead.`
    );
  });
});

describe('SouthFolderScanner with preserve file ignore modified date', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(nowDateString));
    database.prepare.mockImplementation(() => ({
      run: jest.fn()
    }));
    configuration.settings.compression = false;
    configuration.settings.preserveFiles = true;
    configuration.settings.ignoreModifiedDate = true;
    south = new SouthFolderScanner(configuration, items, addValues, addFile, encryptionService, repositoryService, logger, 'baseFolder');
  });

  it('should properly check age with ignore modified date', async () => {
    const mtimeMs = new Date('2020-02-02T02:02:02.222Z').getTime();
    (fs.stat as jest.Mock).mockImplementation(() => ({ mtimeMs: mtimeMs - 10000 }));
    south.getModifiedTime = jest
      .fn()
      .mockReturnValueOnce(mtimeMs - 10000) // saved modified time same than mTime (mtimeMs - 10000) => file did not change
      .mockReturnValueOnce(mtimeMs - 999999); // saved modified time is more recent than mTime (mtimeMs - 999999) => file changed
    expect(await south.checkAge('myFile1')).toEqual(true);
    expect(await south.checkAge('myFile2')).toEqual(true);
  });
});

describe('SouthFolderScanner test connection', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(nowDateString));

    south = new SouthFolderScanner(configuration, items, addValues, addFile, encryptionService, repositoryService, logger, 'baseFolder');
  });

  it('Folder does not exist', async () => {
    const errorMessage = 'Folder does not exist';
    (fs.access as jest.Mock).mockImplementationOnce(() => {
      throw new Error(errorMessage);
    });

    const folderRegex = new RegExp(`Folder '.*(${configuration.settings.inputFolder}).*' does not exist`);
    await expect(south.testConnection()).rejects.toThrowError(folderRegex);

    const accessRegex = new RegExp(`Access error on '.*(${configuration.settings.inputFolder}).*': ${errorMessage}`);
    expect((logger.error as jest.Mock).mock.calls).toEqual([[expect.stringMatching(accessRegex)]]);
  });

  it('No read/write access', async () => {
    const errorMessage = 'No read/write access';
    (fs.access as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve())
      .mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

    await expect(south.testConnection()).rejects.toThrowError('No read/write access on folder');

    const accessRegex = new RegExp(`Access error on '.*(${configuration.settings.inputFolder}).*': ${errorMessage}`);
    expect((logger.error as jest.Mock).mock.calls).toEqual([[expect.stringMatching(accessRegex)]]);
  });

  it('should properly test connection', async () => {
    (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());
    await south.testConnection();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(`Folder "${path.resolve(configuration.settings.inputFolder)}" exists and is reachable`);
  });
});
