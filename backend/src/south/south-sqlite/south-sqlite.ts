import path from 'node:path';
import fs from 'node:fs/promises';

import db from 'better-sqlite3';

import SouthConnector from '../south-connector';
import manifest from './manifest';
import { convertDateTimeFromInstant, convertDateTimeToInstant, createFolder, logQuery, persistResults } from '../../service/utils';
import { OibusItemDTO, SouthConnectorDTO } from '../../../../shared/model/south-connector.model';
import EncryptionService from '../../service/encryption.service';
import ProxyService from '../../service/proxy.service';
import RepositoryService from '../../service/repository.service';
import pino from 'pino';
import { DateTimeSerialization, Instant, Serialization } from '../../../../shared/model/types';
import { DateTime } from 'luxon';
import { QueriesHistory, TestsConnection } from '../south-interface';

/**
 * Class SouthSQLite - Retrieve data from SQLite databases and send them to the cache as CSV files.
 */
export default class SouthSQLite extends SouthConnector implements QueriesHistory, TestsConnection {
  static type = manifest.id;

  private readonly tmpFolder: string;
  constructor(
    configuration: SouthConnectorDTO,
    items: Array<OibusItemDTO>,
    engineAddValuesCallback: (southId: string, values: Array<any>) => Promise<void>,
    engineAddFileCallback: (southId: string, filePath: string) => Promise<void>,
    encryptionService: EncryptionService,
    proxyService: ProxyService,
    repositoryService: RepositoryService,
    logger: pino.Logger,
    baseFolder: string,
    streamMode: boolean
  ) {
    super(
      configuration,
      items,
      engineAddValuesCallback,
      engineAddFileCallback,
      encryptionService,
      proxyService,
      repositoryService,
      logger,
      baseFolder,
      streamMode
    );
    this.tmpFolder = path.resolve(this.baseFolder, 'tmp');
  }

  /**
   * Initialize services (logger, certificate, status data) at startup
   */
  async start(): Promise<void> {
    await createFolder(this.tmpFolder);
    await super.start();
  }

  static async testConnection(
    settings: SouthConnectorDTO['settings'],
    logger: pino.Logger,
    _encryptionService: EncryptionService
  ): Promise<void> {
    logger.trace(`Testing if SQLite file exists`);
    const dbPath = path.resolve(settings.databasePath);

    try {
      await fs.access(dbPath, fs.constants.F_OK);
    } catch (error: any) {
      logger.error(`Access error on '${dbPath}': ${error.message}`);
      throw new Error(`File '${dbPath}' does not exist`);
    }

    logger.trace('Testing connection to SQLite system table');
    const database = db(dbPath);
    let result;

    try {
      result = database
        .prepare(
          `SELECT tbl_name,
                    (SELECT group_concat(name || '(' || type || ')', ', ')
                    FROM PRAGMA_TABLE_INFO(tbl_name)) AS columns
            FROM sqlite_master
            WHERE type = 'table'`
        )
        .all();
    } catch (error: any) {
      logger.error(`Unable to query system table: ${error.message}`);
      throw new Error('Error testing database connection, check logs');
    }
    database.close();

    if (result.length === 0) {
      logger.warn(`Database '${dbPath}' has no tables`);
      throw new Error('Database has no tables');
    }

    const tables = result.map((row: any) => `${row.tbl_name}: [${row.columns}]`).join(',\n');

    logger.info('Database is live with tables (table:[columns]):\n%s', tables);
  }

  /**
   * Get entries from the database between startTime and endTime (if used in the SQL query)
   * and write them into a CSV file and send it to the engine.
   */
  async historyQuery(items: Array<OibusItemDTO>, startTime: Instant, endTime: Instant): Promise<Instant> {
    let updatedStartTime = startTime;

    for (const item of items) {
      const startRequest = DateTime.now().toMillis();
      const result: Array<any> = await this.queryData(item, updatedStartTime, endTime);
      const requestDuration = DateTime.now().toMillis() - startRequest;

      if (result.length > 0) {
        this.logger.info(`Found ${result.length} results for item ${item.name} in ${requestDuration} ms`);

        const formattedResult = result.map(entry => {
          const formattedEntry: Record<string, any> = {};
          Object.entries(entry).forEach(([key, value]) => {
            const datetimeField = item.settings.dateTimeFields.find((element: DateTimeSerialization) => element.field === key);
            if (!datetimeField) {
              formattedEntry[key] = value;
            } else {
              const entryDate = convertDateTimeToInstant(entry[datetimeField.field], datetimeField.datetimeFormat);
              if (datetimeField.useAsReference) {
                if (entryDate > updatedStartTime) {
                  updatedStartTime = entryDate;
                }
              }
              formattedEntry[key] = convertDateTimeFromInstant(entryDate, item.settings.serialization.dateTimeOutputFormat);
            }
          });
          return formattedEntry;
        });
        await persistResults(
          formattedResult,
          item.settings.serialization as Serialization,
          this.configuration.name,
          this.tmpFolder,
          this.addFile.bind(this),
          this.addValues.bind(this),
          this.logger
        );
      } else {
        this.logger.debug(`No result found for item ${item.name}. Request done in ${requestDuration} ms`);
      }
    }
    return updatedStartTime;
  }

  /**
   * Apply the SQL query to the target SQLite database
   */
  async queryData(item: OibusItemDTO, startTime: Instant, endTime: Instant): Promise<Array<any>> {
    this.logger.debug(`Opening ${path.resolve(this.configuration.settings.databasePath)} SQLite database`);
    const database = db(path.resolve(this.configuration.settings.databasePath));

    const datetimeSerialization = item.settings.dateTimeFields.find((serialization: DateTimeSerialization) => serialization.useAsReference);
    const sqliteStartTime = convertDateTimeFromInstant(startTime, datetimeSerialization.datetimeFormat);
    const sqliteEndTime = convertDateTimeFromInstant(endTime, datetimeSerialization.datetimeFormat);
    logQuery(item.settings.query, sqliteStartTime, sqliteEndTime, this.logger);

    try {
      const stmt = database.prepare(item.settings.query);
      const preparedParameters: Record<string, number | string> = {};
      if (item.settings.query.indexOf('@StartTime') !== -1) {
        preparedParameters.StartTime = sqliteStartTime;
      }
      if (item.settings.query.indexOf('@EndTime') !== -1) {
        preparedParameters.EndTime = sqliteEndTime;
      }

      const data = stmt.all(preparedParameters);
      database.close();
      return data;
    } catch (error) {
      database.close();
      throw error;
    }
  }
}