const testConfig = {
  engine: {
    port: 2223,
    user: 'admin',
    password: '23423423',
    filter: ['127.0.0.1', '::1', '::ffff:127.0.0.1', '*'],
    safeMode: false,
    logParameters: {
      consoleLog: { level: 'debug' },
      fileLog: {
        level: 'error',
        fileName: './logs/journal.log',
        maxSize: 1000000,
        numberOfFiles: 5,
        tailable: true,
      },
      sqliteLog: {
        level: 'error',
        fileName: './logs/journal.db',
        maxSize: 50000000,
      },
      lokiLog: {
        level: 'debug',
        lokiAddress: 'localhost:3100',
        interval: 60,
        password: '',
        username: '',
        tokenAddress: '',
      },
    },
    caching: {
      cacheFolder: './cache',
      archive: {
        enabled: true,
        archiveFolder: './cache/archive/',
        retentionDuration: 720,
      },
    },
    historyQuery: { folder: './historyQuery' },
    scanModes: [
      { scanMode: 'everySecond', cronTime: '* * * * * *' },
      { scanMode: 'every10Second', cronTime: '* * * * * /10' },
      { scanMode: 'every1Min', cronTime: '* * * * *' },
      { scanMode: 'listen', cronTime: 'listen' },
    ],
    proxies: [
      {
        name: 'sss',
        protocol: 'http',
        host: 'hhh',
        port: 123,
        username: 'uuu',
        password: 'pppppppppp',
      },
      {
        name: 'ff',
        protocol: 'http',
        host: 'tt',
        port: 1,
        username: 'uii',
        password: 'ppppppppppppp',
      },
      {
        name: 'no-auth',
        protocol: 'http',
        host: 'tt',
        port: 1,
      },
    ],
    engineName: 'OIBus',
    healthSignal: {
      logging: {
        enabled: true,
        frequency: 3600,
      },
      http: {
        enabled: true,
        host: 'https://hostname',
        endpoint: '/api/optimistik/oibus/info',
        authentication: {
          type: 'Basic',
          username: 'username',
          password: 'password',
        },
        id: 'OIBus-test',
        frequency: 300,
        proxy: '',
      },
    },
    httpRequest: {
      stack: 'fetch',
      timeout: 30,
    },
    externalSources: ['any'],
  },
  south: {
    dataSources: [
      {
        id: 'mysql',
        name: 'SQL',
        protocol: 'SQL',
        enabled: true,
        SQL: {
          port: 5306,
          password: 'oibus123',
          connectionTimeout: 1000,
          requestTimeout: 1000,
          databasePath: './test.db',
          host: '127.0.0.1',
          driver: 'mysql',
          username: 'oibus',
          database: 'oibus',
          query: '',
          delimiter: ',',
          maxReadInterval: 3600,
          readIntervalDelay: 200,
          filename: 'sql-@CurrentDate.csv',
          scanMode: 'everySecond',
          timeColumn: 'timestamp',
          timezone: 'Europe/Paris',
          dateFormat: 'yyyy-MM-dd HH:mm:ss.SSS',
          timeFormat: 'yyyy-MM-dd HH:mm:ss.SSS',
          compression: false,
        },
        scanMode: 'every10Second',
        points: [],
      },
      {
        id: 'postgresql',
        name: 'SQL',
        protocol: 'SQL',
        enabled: true,
        SQL: {
          port: 5432,
          password: 'oibus123',
          connectionTimeout: 1000,
          requestTimeout: 1000,
          databasePath: './test.db',
          host: '127.0.0.1',
          driver: 'postgresql',
          username: 'oibus',
          database: 'oibus',
          query: '',
          delimiter: ',',
          maxReadInterval: 3600,
          readIntervalDelay: 200,
          filename: 'sql-@CurrentDate.csv',
          scanMode: 'everySecond',
          timeColumn: 'timestamp',
          timezone: 'Europe/Paris',
          dateFormat: 'yyyy-MM-dd HH:mm:ss.SSS',
          timeFormat: 'yyyy-MM-dd HH:mm:ss.SSS',
          compression: false,
        },
        scanMode: 'every10Second',
        points: [],
      },
      {
        id: 'mssql',
        name: 'SQL',
        protocol: 'SQL',
        enabled: true,
        SQL: {
          port: 1433,
          password: 'Oibus123@',
          connectionTimeout: 1000,
          requestTimeout: 1000,
          databasePath: './test.db',
          host: 'localhost',
          driver: 'mssql',
          username: 'sa',
          database: '',
          query: '',
          encryption: true,
          delimiter: ',',
          maxReadInterval: 3600,
          readIntervalDelay: 200,
          filename: 'sql-@CurrentDate.csv',
          scanMode: 'everySecond',
          timeColumn: 'timestamp',
          timezone: 'Europe/Paris',
          dateFormat: 'yyyy-MM-dd HH:mm:ss.SSS',
          timeFormat: 'yyyy-MM-dd HH:mm:ss.SSS',
          compression: false,
        },
        scanMode: 'every10Second',
        points: [],
      },
    ],
  },
  north: {
    applications: [
      {
        id: 'application-uuid-1',
        name: 'c',
        api: 'Console',
        enabled: true,
        Console: {},
        caching: { sendInterval: 10000, retryInterval: 5000, groupCount: 1, maxSendCount: 10000 },
        subscribedTo: ['datasource-uuid-1'],
      },
      {
        id: 'application-uuid-2',
        name: 'monoiconnect',
        api: 'OIConnect',
        enabled: false,
        OIConnect: {
          authentication: { password: '', type: 'Basic', username: '' },
          timeout: 180000,
          host: 'http://hostname:2223',
          valuesEndpoint: '/addValues',
          fileEndpoint: '/addFile',
          proxy: '',
          stack: 'fetch',
        },
        caching: { sendInterval: 10000, retryInterval: 5000, groupCount: 1000, maxSendCount: 10000 },
        subscribedTo: [],
      },
      {
        id: 'application-uuid-3',
        name: 'RawFileSender',
        enabled: false,
        api: 'OIAnalytics',
        caching: {
          sendInterval: 15000,
          retryInterval: 10000,
        },
        OIAnalytics: {
          host: 'https://hostname',
          endpoint: '/api/optimistik/data/values/upload',
          authentication: {
            type: 'Basic',
            username: 'anyuser',
            password: 'anypass',
          },
        },
        proxy: '',
        subscribedTo: [],
      },
      {
        id: 'application-uuid-4',
        name: 'mqtt',
        api: 'MQTT',
        enabled: true,
        MQTT: {
          password: 'anypass',
          url: 'mqtt://hostname:1883',
          username: 'anyuser',
          qos: 1,
          regExp: '(.*)/',
          topic: '%1$s',
          keyFile: '',
          certFile: '',
          caFile: '',
          rejectUnauthorized: false,
          useDataKeyValue: false,
          keyParentValue: '',
        },
        caching: {
          sendInterval: 10000,
          retryInterval: 5000,
          groupCount: 1000,
          maxSendCount: 10000,
        },
        subscribedTo: [],
      },
      {
        id: 'application-uuid-5',
        name: 'Timescale',
        api: 'TimescaleDB',
        enabled: false,
        TimescaleDB: {
          password: 'anypass',
          user: 'anyuser',
          host: 'anyhost',
          db: 'anydb',
          useDataKeyValue: false,
          regExp: '(.*)',
          table: '%1$s',
          optFields: '',
          keyParentValue: '',
          timestampPathInDataValue: '',
        },
        caching: {
          sendInterval: 10000,
          retryInterval: 5000,
          groupCount: 1000,
          maxSendCount: 10000,
        },
        subscribedTo: [],
      },
      {
        id: 'application-uuid-6',
        name: 'WATSYConnect',
        api: 'WATSYConnect',
        enabled: false,
        WATSYConnect: {
          MQTTUrl: 'mqtt://hostname',
          port: 1883,
          username: 'anyuser',
          password: 'anypass',
          applicativeHostUrl: 'https://localhost.com', // Random path
          secretKey: 'anytoken',
        },
        caching: {
          sendInterval: 1000,
          retryInterval: 5000,
          groupCount: 10000,
          maxSendCount: 10000,
        },
        subscribedTo: [],
      },
      {
        id: 'application-uuid-7',
        name: 'CsvToHttp',
        api: 'CsvToHttp',
        enabled: false,
        CsvToHttp: {
          applicativeHostUrl: 'https://localhost.com',
          requestMethod: 'POST',
          proxy: '',
          mapping: [
            {
              csvField: 'Id',
              httpField: 'Identification',
              type: 'integer',
            },
            {
              csvField: 'Begin',
              httpField: 'date',
              type: 'short date (yyyy-mm-dd)',
            },
          ],
          authentication: {
            type: 'API Key',
            secretKey: 'anytoken',
            key: 'anyvalue',
          },
          bodyMaxLength: 100,
          csvDelimiter: ';',
        },
        caching: {
          sendInterval: 1000,
          retryInterval: 5000,
          groupCount: 1000,
          maxSendCount: 10000,
        },
        subscribedTo: [],
      },
      {
        id: 'application-uuid-8',
        name: 'filewriter',
        api: 'FileWriter',
        enabled: true,
        FileWriter: { outputFolder: './output' },
        caching: { sendInterval: 10000, retryInterval: 5000, groupCount: 1000, maxSendCount: 10000 },
        subscribedTo: [],
      },
      {
        id: 'application-uuid-9',
        name: 'test04',
        api: 'AmazonS3',
        enabled: false,
        AmazonS3: {
          bucket: 'aef',
          region: 'eu-west-3',
          folder: 'azsdfcv',
          proxy: '',
          authentication: {
            key: 'myAccessKey',
            secretKey: 'mySecretKey',
          },
        },
        caching: {
          sendInterval: 10000,
          retryInterval: 5000,
          groupCount: 1000,
          maxSendCount: 10000,
        },
        subscribedTo: [],
      },
      {
        id: 'application-uuid-10',
        name: 'test04 copy',
        api: 'AmazonS3',
        enabled: false,
        AmazonS3: {
          bucket: 'aef',
          folder: 'azsdfcv',
          proxy: '',
          authentication: {
            key: 'myAccessKey',
            secretKey: 'mySecretKey',
          },
        },
        caching: {
          sendInterval: 10000,
          retryInterval: 5000,
          groupCount: 1000,
          maxSendCount: 10000,
        },
        subscribedTo: [],
      },
    ],
  },
  schemaVersion: 5,
  apiList: ['Console', 'OIConnect', 'OIAnalytics'],
  protocolList: ['CSV', 'OPCHDA', 'SQL', 'FolderScanner', 'Modbus', 'OPCUA_HA', 'MQTT'],
}

export default testConfig
