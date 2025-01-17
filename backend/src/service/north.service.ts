import EncryptionService from './encryption.service';
import pino from 'pino';
import RepositoryService from './repository.service';
import NorthConnector from '../north/north-connector';
import NorthConsole from '../north/north-console/north-console';
import NorthOIAnalytics from '../north/north-oianalytics/north-oianalytics';
import NorthAzureBlob from '../north/north-azure-blob/north-azure-blob';
import { NorthConnectorDTO } from '../../../shared/model/north-connector.model';
import NorthAmazonS3 from '../north/north-amazon-s3/north-amazon-s3';
import NorthFileWriter from '../north/north-file-writer/north-file-writer';
import NorthOIConnect from '../north/north-oiconnect/north-oiconnect';
import NorthRestApi from '../north/north-rest-api/north-rest-api';

const northList: Array<typeof NorthConnector<any>> = [
  NorthConsole,
  NorthOIAnalytics,
  NorthOIConnect,
  NorthAzureBlob,
  NorthAmazonS3,
  NorthFileWriter,
  NorthRestApi
];

export default class NorthService {
  constructor(private readonly encryptionService: EncryptionService, private readonly repositoryService: RepositoryService) {}

  /**
   * Return the North connector
   */
  createNorth(settings: NorthConnectorDTO, baseFolder: string, logger: pino.Logger): NorthConnector {
    const NorthConnector = northList.find(connector => connector.type === settings.type);
    if (!NorthConnector) {
      throw Error(`North connector of type ${settings.type} not installed`);
    }

    return new NorthConnector(settings, this.encryptionService, this.repositoryService, logger, baseFolder);
  }

  /**
   * Retrieve a north connector from the config
   */
  getNorth(northId: string): NorthConnectorDTO | null {
    return this.repositoryService.northConnectorRepository.getNorthConnector(northId);
  }

  getNorthList(): Array<NorthConnectorDTO> {
    return this.repositoryService.northConnectorRepository.getNorthConnectors();
  }
}
