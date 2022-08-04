# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.0.5](https://github.com/OptimistikSAS/OIBus/compare/v2.0.4...v2.0.5) (2022-06-07)


### Bug Fixes

* **ads:** fix ads local connection ([386a489](https://github.com/OptimistikSAS/OIBus/commit/386a48945233a7863a2415f399b7f3a4f16c73c2))
* **engine:** fix async disconnection when oibus stop ([1ceeda6](https://github.com/OptimistikSAS/OIBus/commit/1ceeda6b679a75cf95debf259d00a949a029c174))

### [2.0.4](https://github.com/OptimistikSAS/OIBus/compare/v2.0.3...v2.0.4) (2022-05-30)


### Bug Fixes

* **install:** fix go.bat creation at install ([c222112](https://github.com/OptimistikSAS/OIBus/commit/c222112c7c0221fbbf21ee70168ecafb490ea347))
* **install:** fix go.bat file generation ([8e5b38d](https://github.com/OptimistikSAS/OIBus/commit/8e5b38d8e90e35235ce7a8018297c07f0e8cd0b4))
* **install:** fix overwriting of config and removing of data folder ([bb666c3](https://github.com/OptimistikSAS/OIBus/commit/bb666c3cdf4869a671d10e168fc2e6a85475c481))
* **install:** fix pkg dependencies ([a362706](https://github.com/OptimistikSAS/OIBus/commit/a362706a6790daca4e4bf4cc4f61b79c3bdb9184))
* **install:** remove sign tool ([e95a0a4](https://github.com/OptimistikSAS/OIBus/commit/e95a0a440ad5a59bb2683e5d0c7597485a76f182))
* **logger:** fix webserver logger and redundancy logs ([d6ad591](https://github.com/OptimistikSAS/OIBus/commit/d6ad59197eed2523b2a3b6b86974a11efce133b7))
* **opchda:** fix pointId vs nodeId opchda ([1648ef5](https://github.com/OptimistikSAS/OIBus/commit/1648ef5f88bc5fad42c9620201dce1c08e832512))
* **opcua:** manage certificate generation with selfsigned package instead of downloading openssl at runtime ([67bdc74](https://github.com/OptimistikSAS/OIBus/commit/67bdc74bc0247145a702a5789039321a8c8163be))
* **south:** fix slims latestDateRetrieved ([2755797](https://github.com/OptimistikSAS/OIBus/commit/2755797bc1085db2ef39a63b0abd0518b9991896))

### [2.0.3](https://github.com/OptimistikSAS/OIBus/compare/v2.0.2...v2.0.3) (2022-05-16)


### Bug Fixes

* **install:** fix pkg asset for better-sqlite3 ([3374887](https://github.com/OptimistikSAS/OIBus/commit/3374887150afed35b22f526bb9c9c6bfe803129f))

### [2.0.2](https://github.com/OptimistikSAS/OIBus/compare/v2.0.1...v2.0.2) (2022-05-12)


### Bug Fixes

* **doc:** truncate changelog ([203d28f](https://github.com/OptimistikSAS/OIBus/commit/203d28f51dffb01d01292afa56e50cb60fd21745))
* **engine:** stop cache when stopping OIBus Engine ([cd51260](https://github.com/OptimistikSAS/OIBus/commit/cd51260fe697cf8c25bb06c0ce373373961fddf6))
* **south:** fix lastCompletedDate on Rest API connector ([69a10f0](https://github.com/OptimistikSAS/OIBus/commit/69a10f0728992d6aa9bd0a504f5836be152fdde0))

### [2.0.1](https://github.com/OptimistikSAS/OIBus/compare/v2.0.0...v2.0.1) (2022-05-10)


### Bug Fixes

* **deps:** update aws-sdk-js-v3 monorepo ([58df450](https://github.com/OptimistikSAS/OIBus/commit/58df450b33da82072992e7de528dcdafd0f0c799))
* **deps:** update dependency luxon to v2.3.2 ([67e8826](https://github.com/OptimistikSAS/OIBus/commit/67e882610c2cc05ba264e1523c2a7f4cec56580d))
* **deps:** update dependency nanoid to v3.3.4 ([bb317cb](https://github.com/OptimistikSAS/OIBus/commit/bb317cb4d154b82542b0424515e009baa6072187))
* **deps:** update dependency sqlite3 to v5.0.8 ([cf44999](https://github.com/OptimistikSAS/OIBus/commit/cf44999ccba7b3c8756386d055010b7d01ec9223))
* **deps:** update react monorepo to v18 (major) ([dc68f98](https://github.com/OptimistikSAS/OIBus/commit/dc68f98b72db240cc3c447ad15f1beaa9caeeac3))
* **engine:** fix web server reload and opcua server restart ([041b1fa](https://github.com/OptimistikSAS/OIBus/commit/041b1fa9ca6d7245b2e4da567c584d21e16ad9d9))