import { KoaContext } from '../koa';
import { HistoryQueryCommandDTO, HistoryQueryCreateCommandDTO, HistoryQueryDTO } from '../../../../shared/model/history-query.model';
import JoiValidator from './validators/joi.validator';

import {
  SouthConnectorItemCommandDTO,
  SouthConnectorItemDTO,
  SouthConnectorItemSearchParam,
  SouthConnectorManifest
} from '../../../../shared/model/south-connector.model';
import { NorthConnectorManifest } from '../../../../shared/model/north-connector.model';
import { Page } from '../../../../shared/model/types';
import csv from 'papaparse';
import fs from 'node:fs/promises';
import { southManifests } from './south-connector.controller';
import AbstractController from './abstract.controller';
import Joi from 'joi';

export default class HistoryQueryController extends AbstractController {
  constructor(
    protected readonly validator: JoiValidator,
    protected readonly schema: Joi.ObjectSchema,
    private southManifests: Array<SouthConnectorManifest>,
    private northManifests: Array<NorthConnectorManifest>
  ) {
    super(validator, schema);
  }

  getHistoryQueries = (ctx: KoaContext<void, Array<HistoryQueryDTO>>) => {
    const historyQueries = ctx.app.repositoryService.historyQueryRepository.getHistoryQueries();
    ctx.ok(
      historyQueries.map(historyQuery => {
        const southManifest = this.southManifests.find(manifest => manifest.id === historyQuery.southType);
        const northManifest = this.northManifests.find(manifest => manifest.id === historyQuery.northType);
        if (southManifest && northManifest) {
          historyQuery.southSettings = ctx.app.encryptionService.filterSecrets(historyQuery.southSettings, southManifest.settings);
          historyQuery.northSettings = ctx.app.encryptionService.filterSecrets(historyQuery.northSettings, northManifest.settings);
          return historyQuery;
        }
        return null;
      })
    );
  };

  getHistoryQuery = (ctx: KoaContext<void, HistoryQueryDTO>) => {
    const historyQuery = ctx.app.repositoryService.historyQueryRepository.getHistoryQuery(ctx.params.id);
    if (!historyQuery) {
      return ctx.notFound();
    }
    const southManifest = this.southManifests.find(manifest => manifest.id === historyQuery.southType);
    const northManifest = this.northManifests.find(manifest => manifest.id === historyQuery.northType);
    if (southManifest && northManifest) {
      historyQuery.southSettings = ctx.app.encryptionService.filterSecrets(historyQuery.southSettings, southManifest.settings);
      historyQuery.northSettings = ctx.app.encryptionService.filterSecrets(historyQuery.northSettings, northManifest.settings);
      return ctx.ok(historyQuery);
    } else {
      ctx.notFound();
    }
  };

  createHistoryQuery = async (ctx: KoaContext<HistoryQueryCreateCommandDTO, void>) => {
    if (!ctx.request.body || !ctx.request.body.items || !ctx.request.body.historyQuery) {
      return ctx.badRequest();
    }

    const command = ctx.request.body.historyQuery;
    const itemsToAdd = ctx.request.body.items;
    const southManifest = this.southManifests.find(manifest => manifest.id === command.southType);
    if (!southManifest) {
      return ctx.throw(404, 'South manifest not found');
    }
    let southSource;
    if (ctx.request.body.fromSouthId) {
      southSource = ctx.app.repositoryService.southConnectorRepository.getSouthConnector(ctx.request.body.fromSouthId);
      if (!southSource) {
        return ctx.notFound();
      }
    }

    const northManifest = this.northManifests.find(manifest => manifest.id === command.northType);
    if (!northManifest) {
      return ctx.throw(404, 'North manifest not found');
    }
    let northSource;
    if (ctx.request.body.fromNorthId) {
      northSource = ctx.app.repositoryService.northConnectorRepository.getNorthConnector(ctx.request.body.fromNorthId);
      if (!northSource) {
        return ctx.notFound();
      }
    }

    try {
      await this.validator.validateSettings(southManifest.settings, command.southSettings);
      await this.validator.validateSettings(northManifest.settings, command.northSettings);
      // Check if item settings match the item schema, throw an error otherwise
      for (const item of itemsToAdd) {
        await this.validator.validateSettings(southManifest.items.settings, item.settings);
      }

      command.southSettings = await ctx.app.encryptionService.encryptConnectorSecrets(
        command.southSettings,
        southSource?.settings,
        southManifest.settings
      );
      command.northSettings = await ctx.app.encryptionService.encryptConnectorSecrets(
        command.northSettings,
        northSource?.settings,
        northManifest.settings
      );

      const historyQuery = await ctx.app.reloadService.onCreateHistoryQuery(command, itemsToAdd);
      ctx.created(historyQuery);
    } catch (error: any) {
      ctx.badRequest(error.message);
    }
  };

  updateHistoryQuery = async (ctx: KoaContext<HistoryQueryCommandDTO, void>) => {
    const historyQuery = ctx.app.repositoryService.historyQueryRepository.getHistoryQuery(ctx.params.id);
    if (!historyQuery) {
      return ctx.notFound();
    }
    const southManifest = this.southManifests.find(manifest => manifest.id === historyQuery.southType);
    if (!southManifest) {
      return ctx.throw(404, 'South manifest not found');
    }

    const northManifest = this.northManifests.find(manifest => manifest.id === historyQuery.northType);
    if (!northManifest) {
      return ctx.throw(404, 'North manifest not found');
    }

    const command = ctx.request.body as HistoryQueryCommandDTO;
    try {
      await this.validator.validateSettings(southManifest.settings, historyQuery.southSettings);
      await this.validator.validateSettings(northManifest.settings, historyQuery.northSettings);

      command.southSettings = await ctx.app.encryptionService.encryptConnectorSecrets(
        command.southSettings,
        historyQuery.southSettings,
        southManifest.settings
      );

      command.northSettings = await ctx.app.encryptionService.encryptConnectorSecrets(
        command.northSettings,
        historyQuery.northSettings,
        northManifest.settings
      );
      await ctx.app.reloadService.onUpdateHistoryQuerySettings(ctx.params.id, command);
      ctx.noContent();
    } catch (error: any) {
      ctx.badRequest(error.message);
    }
  };

  startHistoryQuery = async (ctx: KoaContext<void, void>) => {
    const historyQuery = ctx.app.repositoryService.historyQueryRepository.getHistoryQuery(ctx.params.historyQueryId);
    if (!historyQuery) {
      return ctx.notFound();
    }

    try {
      await ctx.app.reloadService.onStartHistoryQuery(ctx.params.historyQueryId);
      ctx.noContent();
    } catch (error: any) {
      ctx.badRequest(error.message);
    }
  };

  stopHistoryQuery = async (ctx: KoaContext<void, void>) => {
    const historyQuery = ctx.app.repositoryService.historyQueryRepository.getHistoryQuery(ctx.params.historyQueryId);
    if (!historyQuery) {
      return ctx.notFound();
    }

    try {
      await ctx.app.reloadService.onStopHistoryQuery(ctx.params.historyQueryId);
      ctx.noContent();
    } catch (error: any) {
      ctx.badRequest(error.message);
    }
  };

  deleteHistoryQuery = async (ctx: KoaContext<void, void>) => {
    await ctx.app.reloadService.onDeleteHistoryQuery(ctx.params.id);
    ctx.noContent();
  };

  async searchHistoryQueryItems(ctx: KoaContext<void, Page<SouthConnectorItemDTO>>): Promise<void> {
    const searchParams: SouthConnectorItemSearchParam = {
      page: ctx.query.page ? parseInt(ctx.query.page as string, 10) : 0,
      name: (ctx.query.name as string) || null
    };
    const southItems = ctx.app.repositoryService.historyQueryItemRepository.searchHistoryItems(ctx.params.historyQueryId, searchParams);
    ctx.ok(southItems);
  }

  async listItems(ctx: KoaContext<void, Array<SouthConnectorItemDTO>>): Promise<void> {
    const items = ctx.app.repositoryService.historyQueryItemRepository.getHistoryItems(ctx.params.historyQueryId);
    ctx.ok(items);
  }

  async getHistoryQueryItem(ctx: KoaContext<void, SouthConnectorItemDTO>): Promise<void> {
    const southItem = ctx.app.repositoryService.historyQueryItemRepository.getHistoryItem(ctx.params.id);
    if (southItem) {
      ctx.ok(southItem);
    } else {
      ctx.notFound();
    }
  }

  async createHistoryQueryItem(ctx: KoaContext<SouthConnectorItemCommandDTO, SouthConnectorItemDTO>): Promise<void> {
    try {
      const historyQuery = ctx.app.repositoryService.historyQueryRepository.getHistoryQuery(ctx.params.historyQueryId);
      if (!historyQuery) {
        return ctx.throw(404, 'History query not found');
      }

      const southManifest = this.southManifests.find(manifest => manifest.id === historyQuery.southType);
      if (!southManifest) {
        return ctx.throw(404, 'South manifest not found');
      }

      const command: SouthConnectorItemCommandDTO = ctx.request.body!;
      await this.validator.validateSettings(southManifest.items.settings, command?.settings);

      const historyQueryItem = await ctx.app.reloadService.onCreateHistoryItem(ctx.params.historyQueryId, command);
      ctx.created(historyQueryItem);
    } catch (error: any) {
      ctx.badRequest(error.message);
    }
  }

  async updateHistoryQueryItem(ctx: KoaContext<SouthConnectorItemCommandDTO, void>): Promise<void> {
    try {
      const historyQuery = ctx.app.repositoryService.historyQueryRepository.getHistoryQuery(ctx.params.historyQueryId);
      if (!historyQuery) {
        return ctx.throw(404, 'History query not found');
      }

      const southManifest = this.southManifests.find(manifest => manifest.id === historyQuery.southType);
      if (!southManifest) {
        return ctx.throw(404, 'History query South manifest not found');
      }

      const historyQueryItem = ctx.app.repositoryService.historyQueryItemRepository.getHistoryItem(ctx.params.id);
      if (historyQueryItem) {
        const command: SouthConnectorItemCommandDTO = ctx.request.body!;
        await this.validator.validateSettings(southManifest.items.settings, command?.settings);
        await ctx.app.reloadService.onUpdateHistoryItemsSettings(ctx.params.historyQueryId, historyQueryItem, command);
        ctx.noContent();
      } else {
        ctx.notFound();
      }
    } catch (error: any) {
      ctx.badRequest(error.message);
    }
  }

  async deleteHistoryQueryItem(ctx: KoaContext<void, void>): Promise<void> {
    await ctx.app.reloadService.onDeleteHistoryItem(ctx.params.historyQueryId, ctx.params.id);
    ctx.noContent();
  }

  async enableHistoryQueryItem(ctx: KoaContext<void, void>): Promise<void> {
    await ctx.app.reloadService.onEnableHistoryItem(ctx.params.historyQueryId, ctx.params.id);
    ctx.noContent();
  }

  async disableHistoryQueryItem(ctx: KoaContext<void, void>): Promise<void> {
    await ctx.app.reloadService.onDisableHistoryItem(ctx.params.historyQueryId, ctx.params.id);
    ctx.noContent();
  }

  async deleteAllItems(ctx: KoaContext<void, void>): Promise<void> {
    await ctx.app.reloadService.onDeleteAllHistoryItems(ctx.params.historyQueryId);
    ctx.noContent();
  }

  async exportItems(ctx: KoaContext<void, any>): Promise<void> {
    const southItems = ctx.app.repositoryService.historyQueryItemRepository.getHistoryItems(ctx.params.historyQueryId).map(item => {
      const flattenedItem: Record<string, any> = {
        ...item
      };
      for (const [itemSettingsKey, itemSettingsValue] of Object.entries(item.settings)) {
        flattenedItem[`settings_${itemSettingsKey}`] = itemSettingsValue;
      }
      delete flattenedItem.settings;
      delete flattenedItem.connectorId;
      return flattenedItem;
    });
    ctx.body = csv.unparse(southItems);
    ctx.set('Content-disposition', 'attachment; filename=items.csv');
    ctx.set('Content-Type', 'application/force-download');
    ctx.ok();
  }

  async uploadItems(ctx: KoaContext<void, any>): Promise<void> {
    const historyQuery = ctx.app.repositoryService.historyQueryRepository.getHistoryQuery(ctx.params.historyQueryId);
    if (!historyQuery) {
      return ctx.throw(404, 'History query not found');
    }

    const southManifest = southManifests.find(manifest => manifest.id === historyQuery.southType);
    if (!southManifest) {
      return ctx.throw(404, 'History query South manifest not found');
    }

    const file = ctx.request.file;
    if (file.mimetype !== 'text/csv') {
      return ctx.badRequest();
    }
    let items: Array<any> = [];
    try {
      const fileContent = await fs.readFile(file.path);
      const csvContent = csv.parse(fileContent.toString('utf8'), { header: true });
      items = csvContent.data.map((data: any) => {
        const item: Record<string, any> = { settings: {} };
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('settings_')) {
            item.settings[key.replace('settings_', '')] = value;
          } else {
            item[key] = value;
          }
        }
        return item;
      });
      // Check if item settings match the item schema, throw an error otherwise
      for (const item of items) {
        await this.validator.validateSettings(southManifest.items.settings, item.settings);
      }
    } catch (error: any) {
      return ctx.badRequest(error.message);
    }

    try {
      const itemsToAdd = items.filter(item => !item.id);
      const itemsToUpdate = items.filter(item => item.id);
      await ctx.app.reloadService.onCreateOrUpdateHistoryQueryItems(historyQuery, itemsToAdd, itemsToUpdate);
    } catch {
      return ctx.badRequest();
    }

    ctx.noContent();
  }
}
