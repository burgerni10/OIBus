import fs from 'node:fs/promises';

import NorthAzureBlob from './north-azure-blob';
import pino from 'pino';
import PinoLogger from '../../tests/__mocks__/logger.mock';
import EncryptionService from '../../service/encryption.service';
import EncryptionServiceMock from '../../tests/__mocks__/encryption-service.mock';
import RepositoryService from '../../service/repository.service';
import RepositoryServiceMock from '../../tests/__mocks__/repository-service.mock';
import { NorthConnectorDTO } from '../../../../shared/model/north-connector.model';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { AzurePowerShellCredential, DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import ValueCacheServiceMock from '../../tests/__mocks__/value-cache-service.mock';
import FileCacheServiceMock from '../../tests/__mocks__/file-cache-service.mock';
import { NorthAzureBlobSettings } from '../../../../shared/model/north-settings.model';
import ArchiveServiceMock from '../../tests/__mocks__/archive-service.mock';

const uploadMock = jest.fn().mockReturnValue(Promise.resolve({ requestId: 'requestId' }));
const getBlockBlobClientMock = jest.fn().mockImplementation(() => ({
  upload: uploadMock
}));
const getContainerClientMock = jest.fn().mockImplementation(() => ({
  getBlockBlobClient: getBlockBlobClientMock
}));
jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: jest.fn().mockImplementation(() => ({
    getContainerClient: getContainerClientMock
  })),
  StorageSharedKeyCredential: jest.fn()
}));
jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn(),
  ClientSecretCredential: jest.fn(),
  AzurePowerShellCredential: jest.fn()
}));
jest.mock('node:fs/promises');
jest.mock('../../service/utils');
jest.mock(
  '../../service/cache/archive.service',
  () =>
    function () {
      return new ArchiveServiceMock();
    }
);
jest.mock(
  '../../service/cache/value-cache.service',
  () =>
    function () {
      return new ValueCacheServiceMock();
    }
);
jest.mock(
  '../../service/cache/file-cache.service',
  () =>
    function () {
      return new FileCacheServiceMock();
    }
);
const resetMetrics = jest.fn();
jest.mock(
  '../../service/north-connector-metrics.service',
  () =>
    function () {
      return {
        initMetrics: jest.fn(),
        updateMetrics: jest.fn(),
        get stream() {
          return { stream: 'myStream' };
        },
        resetMetrics,
        metrics: {
          numberOfValuesSent: 1,
          numberOfFilesSent: 1
        }
      };
    }
);

const logger: pino.Logger = new PinoLogger();
const encryptionService: EncryptionService = new EncryptionServiceMock('', '');
const repositoryService: RepositoryService = new RepositoryServiceMock();

const configuration: NorthConnectorDTO<NorthAzureBlobSettings> = {
  id: 'id',
  name: 'north',
  type: 'test',
  description: 'my test connector',
  enabled: true,
  settings: {
    account: 'account',
    container: 'container',
    path: '',
    authentication: 'sasToken',
    sasToken: 'sas',
    accessKey: '',
    tenantId: '',
    clientId: '',
    clientSecret: ''
  },
  caching: {
    scanModeId: 'id1',
    retryInterval: 5000,
    groupCount: 10000,
    maxSendCount: 10000,
    retryCount: 2,
    sendFileImmediately: true,
    maxSize: 1000
  },
  archive: {
    enabled: true,
    retentionDuration: 720
  }
};

describe('NorthAzureBlob', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('should properly handle files with Shared Access Signature authentication', async () => {
    const filePath = '/path/to/file/example-123.file';
    (fs.stat as jest.Mock).mockImplementationOnce(() => Promise.resolve({ size: 666 }));
    (fs.readFile as jest.Mock).mockImplementationOnce(() => Promise.resolve('content'));

    configuration.settings.authentication = 'sasToken';
    configuration.settings.sasToken = 'sas token';
    const north = new NorthAzureBlob(configuration, encryptionService, repositoryService, logger, 'baseFolder');

    await north.start();
    await north.handleFile(filePath);

    expect(fs.stat).toHaveBeenCalledWith(filePath);
    expect(fs.readFile).toHaveBeenCalledWith(filePath);
    expect(BlobServiceClient).toHaveBeenCalledWith(
      `https://${configuration.settings.account}.blob.core.windows.net?${configuration.settings.sasToken}`
    );
    expect(getContainerClientMock).toHaveBeenCalledWith(configuration.settings.container);
    expect(getBlockBlobClientMock).toHaveBeenCalledWith('example.file');
    expect(uploadMock).toHaveBeenCalledWith('content', 666);
  });

  it('should properly handle files with Access Key authentication', async () => {
    const filePath = '/path/to/file/example-123.file';
    (fs.stat as jest.Mock).mockImplementationOnce(() => Promise.resolve({ size: 666 }));
    (fs.readFile as jest.Mock).mockImplementationOnce(() => Promise.resolve('content'));
    const sharedKeyCredential = jest.fn();
    (StorageSharedKeyCredential as jest.Mock).mockImplementationOnce(() => sharedKeyCredential);

    configuration.settings.authentication = 'accessKey';
    configuration.settings.accessKey = 'access key';
    const north = new NorthAzureBlob(configuration, encryptionService, repositoryService, logger, 'baseFolder');

    await north.start();
    await north.handleFile(filePath);

    expect(fs.stat).toHaveBeenCalledWith(filePath);
    expect(fs.readFile).toHaveBeenCalledWith(filePath);
    expect(StorageSharedKeyCredential).toHaveBeenCalledWith(configuration.settings.account, configuration.settings.accessKey);
    expect(BlobServiceClient).toHaveBeenCalledWith(`https://${configuration.settings.account}.blob.core.windows.net`, sharedKeyCredential);
    expect(getContainerClientMock).toHaveBeenCalledWith(configuration.settings.container);
    expect(getBlockBlobClientMock).toHaveBeenCalledWith('example.file');
    expect(uploadMock).toHaveBeenCalledWith('content', 666);
  });

  it('should properly handle files with Azure Active Directory authentication', async () => {
    const filePath = '/path/to/file/example-123.file';
    (fs.stat as jest.Mock).mockImplementationOnce(() => Promise.resolve({ size: 666 }));
    (fs.readFile as jest.Mock).mockImplementationOnce(() => Promise.resolve('content'));
    const clientSecretCredential = jest.fn();
    (ClientSecretCredential as jest.Mock).mockImplementationOnce(() => clientSecretCredential);

    configuration.settings.authentication = 'aad';
    configuration.settings.tenantId = 'tenantId';
    configuration.settings.clientId = 'clientId';
    configuration.settings.clientSecret = 'clientSecret';
    const north = new NorthAzureBlob(configuration, encryptionService, repositoryService, logger, 'baseFolder');

    await north.start();
    await north.handleFile(filePath);

    expect(fs.stat).toHaveBeenCalledWith(filePath);
    expect(fs.readFile).toHaveBeenCalledWith(filePath);
    expect(ClientSecretCredential).toHaveBeenCalled();
    expect(BlobServiceClient).toHaveBeenCalledWith(
      `https://${configuration.settings.account}.blob.core.windows.net`,
      clientSecretCredential
    );
    expect(getContainerClientMock).toHaveBeenCalledWith(configuration.settings.container);
    expect(getBlockBlobClientMock).toHaveBeenCalledWith('example.file');
    expect(uploadMock).toHaveBeenCalledWith('content', 666);
  });

  it('should properly handle files with external auth', async () => {
    const filePath = '/path/to/file/example-123.file';
    (fs.stat as jest.Mock).mockImplementationOnce(() => Promise.resolve({ size: 666 }));
    (fs.readFile as jest.Mock).mockImplementationOnce(() => Promise.resolve('content'));
    const defaultAzureCredential = jest.fn();
    (DefaultAzureCredential as jest.Mock).mockImplementationOnce(() => defaultAzureCredential);

    configuration.settings.authentication = 'external';
    const north = new NorthAzureBlob(configuration, encryptionService, repositoryService, logger, 'baseFolder');

    await north.start();
    await north.handleFile(filePath);

    expect(fs.stat).toHaveBeenCalledWith(filePath);
    expect(fs.readFile).toHaveBeenCalledWith(filePath);
    expect(DefaultAzureCredential).toHaveBeenCalled();
    expect(BlobServiceClient).toHaveBeenCalledWith(
      `https://${configuration.settings.account}.blob.core.windows.net`,
      defaultAzureCredential
    );
    expect(getContainerClientMock).toHaveBeenCalledWith(configuration.settings.container);
    expect(getBlockBlobClientMock).toHaveBeenCalledWith('example.file');
    expect(uploadMock).toHaveBeenCalledWith('content', 666);
  });

  it('should properly handle files with powershell credentials', async () => {
    const filePath = '/path/to/file/example-123.file';
    (fs.stat as jest.Mock).mockImplementationOnce(() => Promise.resolve({ size: 666 }));
    (fs.readFile as jest.Mock).mockImplementationOnce(() => Promise.resolve('content'));
    const defaultAzureCredential = jest.fn();
    (AzurePowerShellCredential as jest.Mock).mockImplementationOnce(() => defaultAzureCredential);

    configuration.settings.path = 'my path';
    configuration.settings.authentication = 'powershell';
    const north = new NorthAzureBlob(configuration, encryptionService, repositoryService, logger, 'baseFolder');

    await north.start();
    await north.handleFile(filePath);

    expect(fs.stat).toHaveBeenCalledWith(filePath);
    expect(fs.readFile).toHaveBeenCalledWith(filePath);
    expect(AzurePowerShellCredential).toHaveBeenCalled();
    expect(BlobServiceClient).toHaveBeenCalledWith(
      `https://${configuration.settings.account}.blob.core.windows.net`,
      defaultAzureCredential
    );
    expect(getContainerClientMock).toHaveBeenCalledWith(configuration.settings.container);
    expect(getBlockBlobClientMock).toHaveBeenCalledWith('my path/example.file');
    expect(uploadMock).toHaveBeenCalledWith('content', 666);
  });

  it('should successfully test', async () => {
    const defaultAzureCredential = jest.fn();
    (AzurePowerShellCredential as jest.Mock).mockImplementationOnce(() => defaultAzureCredential);
    const exists = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    (getContainerClientMock as jest.Mock).mockImplementation(() => {
      return {
        exists: exists
      };
    });
    const north = new NorthAzureBlob(configuration, encryptionService, repositoryService, logger, 'baseFolder');
    await north.testConnection();
    expect(AzurePowerShellCredential).toHaveBeenCalled();
    expect(BlobServiceClient).toHaveBeenCalledWith(
      `https://${configuration.settings.account}.blob.core.windows.net`,
      defaultAzureCredential
    );
    expect(getContainerClientMock).toHaveBeenCalledWith(configuration.settings.container);
    expect(logger.info).toHaveBeenCalledWith(`Access to container ${configuration.settings.container} ok`);
    await expect(north.testConnection()).rejects.toThrow(new Error(`Container ${configuration.settings.container} does not exist`));
  });

  it('should manage test error', async () => {
    const defaultAzureCredential = jest.fn();
    (AzurePowerShellCredential as jest.Mock).mockImplementationOnce(() => defaultAzureCredential);
    (getContainerClientMock as jest.Mock).mockImplementation(() => {
      throw new Error('connection error');
    });
    const north = new NorthAzureBlob(configuration, encryptionService, repositoryService, logger, 'baseFolder');

    await expect(north.testConnection()).rejects.toThrow(new Error('connection error'));
    expect(getContainerClientMock).toHaveBeenCalledWith(configuration.settings.container);
    expect(logger.error).toHaveBeenCalledWith(`Error testing Azure Blob connection. ${new Error('connection error')}`);
  });

  it('should manage bad authentication type', async () => {
    // @ts-ignore
    configuration.settings.authentication = 'bad';
    const north = new NorthAzureBlob(configuration, encryptionService, repositoryService, logger, 'baseFolder');

    await expect(north.start()).rejects.toThrow(
      new Error(`Authentication "${configuration.settings.authentication}" not supported for North "${configuration.name}"`)
    );
  });
});
