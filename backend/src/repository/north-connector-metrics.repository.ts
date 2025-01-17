import { Database } from 'better-sqlite3';
import { NorthConnectorMetrics } from '../../../shared/model/engine.model';
import { DateTime } from 'luxon';

export const NORTH_METRICS_TABLE = 'north_metrics';

/**
 * Repository used for North connectors metrics
 */
export default class NorthConnectorMetricsRepository {
  constructor(private readonly _database: Database) {}

  get database(): Database {
    return this._database;
  }

  initMetrics(northId: string) {
    const foundMetrics = this.getMetrics(northId);
    if (!foundMetrics) {
      const insertQuery =
        `INSERT INTO ${NORTH_METRICS_TABLE} (north_id, metrics_start, nb_values, nb_files, ` +
        `last_value, last_file, last_connection, last_run_start, last_run_duration, cache_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
      this._database.prepare(insertQuery).run(northId, DateTime.now().toUTC().toISO(), 0, 0, null, null, null, null, null, 0);
    }
  }

  getMetrics(northId: string): NorthConnectorMetrics | null {
    const query =
      `SELECT metrics_start AS metricsStart, nb_values AS numberOfValuesSent, nb_files AS numberOfFilesSent, ` +
      `last_value AS lastValueSent, last_file AS lastFileSent, last_connection AS lastConnection, last_run_start AS lastRunStart, ` +
      `last_run_duration AS lastRunDuration, cache_size AS cacheSize FROM ${NORTH_METRICS_TABLE} WHERE north_id = ?;`;
    const result: NorthConnectorMetrics | undefined = this._database.prepare(query).get(northId) as NorthConnectorMetrics;
    if (!result) return null;
    return {
      metricsStart: result.metricsStart,
      numberOfValuesSent: result.numberOfValuesSent,
      numberOfFilesSent: result.numberOfFilesSent,
      lastValueSent: result.lastValueSent ? JSON.parse(result.lastValueSent) : null,
      lastFileSent: result.lastFileSent,
      lastConnection: result.lastConnection,
      lastRunStart: result.lastRunStart,
      lastRunDuration: result.lastRunDuration,
      cacheSize: result.cacheSize
    };
  }

  updateMetrics(northId: string, metrics: NorthConnectorMetrics): void {
    const updateQuery =
      `UPDATE ${NORTH_METRICS_TABLE} SET metrics_start = ?, nb_values = ?, nb_files = ?, last_value = ?, last_file = ?, ` +
      'last_connection = ?, last_run_start = ?, last_run_duration = ?, cache_size = ? WHERE north_id = ?;';
    this._database
      .prepare(updateQuery)
      .run(
        metrics.metricsStart,
        metrics.numberOfValuesSent,
        metrics.numberOfFilesSent,
        metrics.lastValueSent ? JSON.stringify(metrics.lastValueSent) : null,
        metrics.lastFileSent,
        metrics.lastConnection,
        metrics.lastRunStart,
        metrics.lastRunDuration,
        metrics.cacheSize,
        northId
      );
  }

  removeMetrics(northId: string): void {
    const query = `DELETE FROM ${NORTH_METRICS_TABLE} WHERE north_id = ?;`;
    this._database.prepare(query).run(northId);
  }
}
