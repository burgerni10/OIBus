import BaseEngine from './base-engine';
import EncryptionService from '../service/encryption.service';
import NorthService from '../service/north.service';
import SouthService from '../service/south.service';
import pino from 'pino';
import HistoryQueryService from '../service/history-query.service';
import HistoryQuery from './history-query';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createFolder, filesExists } from '../service/utils';

import { HistoryQueryDTO } from '../../../shared/model/history-query.model';
import { SouthConnectorItemDTO } from '../../../shared/model/south-connector.model';
import { PassThrough } from 'node:stream';

const CACHE_FOLDER = './cache/history-query';

/**
 * Manage history queries by running {@link HistoryQuery} one after another
 * @class HistoryQueryEngine
 */
export default class HistoryQueryEngine extends BaseEngine {
  private historyQueries: Map<string, HistoryQuery> = new Map<string, HistoryQuery>();

  constructor(
    encryptionService: EncryptionService,
    northService: NorthService,
    southService: SouthService,
    private readonly historyQueryService: HistoryQueryService,
    logger: pino.Logger
  ) {
    super(encryptionService, northService, southService, logger, CACHE_FOLDER);
  }

  override async start(): Promise<void> {
    const historyQueriesSettings = this.historyQueryService.getHistoryQueryList();
    for (const settings of historyQueriesSettings) {
      await this.startHistoryQuery(settings);
    }
  }

  /**
   * Gracefully stop every Timer, Protocol and Application
   */
  async stop(): Promise<void> {
    for (const historyQueryId of this.historyQueries.keys()) {
      await this.stopHistoryQuery(historyQueryId);
    }
    this.historyQueries.clear();
  }

  async startHistoryQuery(settings: HistoryQueryDTO): Promise<void> {
    if (!this.historyQueries.get(settings.id)) {
      const items = this.historyQueryService.getItems(settings.id);
      const baseFolder = path.resolve(this.cacheFolder, `history-${settings.id}`);
      await createFolder(baseFolder);
      const historyQuery = new HistoryQuery(
        settings,
        this.southService,
        this.northService,
        this.historyQueryService,
        items,
        this.logger.child({ scopeType: 'history-query', scopeId: settings.id, scopeName: settings.name }),
        baseFolder
      );
      this.historyQueries.set(settings.id, historyQuery);
      historyQuery.start().catch(error => {
        this.logger.error(error);
      });
    } else {
      await this.historyQueries.get(settings.id)!.stop();
      this.historyQueries
        .get(settings.id)!
        .start()
        .catch(error => {
          this.logger.error(error);
        });
    }
  }

  async addItemToHistoryQuery(historyId: string, item: SouthConnectorItemDTO): Promise<void> {
    await this.historyQueries.get(historyId)?.addItem(item);
  }

  async deleteItemFromHistoryQuery(historyId: string, item: SouthConnectorItemDTO): Promise<void> {
    await this.historyQueries.get(historyId)?.deleteItem(item);
  }

  async deleteAllItemsFromHistoryQuery(historyId: string): Promise<void> {
    await this.historyQueries.get(historyId)?.deleteItems();
  }

  async updateItemInHistoryQuery(historyId: string, item: SouthConnectorItemDTO): Promise<void> {
    await this.historyQueries.get(historyId)?.updateItem(item);
  }

  async stopHistoryQuery(historyId: string, resetCache = false): Promise<void> {
    const historyQuery = this.historyQueries.get(historyId);
    if (!historyQuery) {
      return;
    }

    await historyQuery.stop(resetCache);
    this.historyQueries.delete(historyId);
  }

  setLogger(value: pino.Logger) {
    super.setLogger(value);

    for (const [id, historyQuery] of this.historyQueries.entries()) {
      const settings = this.historyQueryService.getHistoryQuery(id);
      if (settings) {
        historyQuery.setLogger(this.logger.child({ scopeType: 'history-query', scopeId: settings.id, scopeName: settings.name }));
      }
    }
  }

  getHistoryDataStream(historyId: string): PassThrough | null {
    return this.historyQueries.get(historyId)?.getMetricsDataStream() || null;
  }

  /**
   * Stops the History query and deletes all cache inside the base folder
   */
  async deleteHistoryQuery(historyId: string, name: string): Promise<void> {
    await this.stopHistoryQuery(historyId);
    const baseFolder = path.resolve(this.cacheFolder, `history-${historyId}`);

    try {
      this.logger.trace(`Deleting base folder "${baseFolder}" of History query "${name}" (${historyId})`);

      if (await filesExists(baseFolder)) {
        await fs.rm(baseFolder, { recursive: true });
      }

      this.logger.info(`Deleted History query "${name}" (${historyId})`);
    } catch (error) {
      this.logger.error(`Unable to delete History query "${name}" (${historyId}) base folder: ${error}`);
    }
  }
}
