## 0.0.1 (2026-04-06)


### Bug Fixes

* address code review – security scheme name, DTO @ApiProperty, Swagger decorators, generate:openapi script ([889053c](https://github.com/stritti/nocodb-middleware/commit/889053c45ecac574b55dec8fb40414e0f789c02b))
* address code review feedback - align security scheme, add @ApiProperty to DTOs, add Swagger decorators to controller, add generate:openapi script ([d2d47ac](https://github.com/stritti/nocodb-middleware/commit/d2d47ac7acd85d5b7c009989590c7f7979385aa5))
* address lint and timer issues in test files ([d449daa](https://github.com/stritti/nocodb-middleware/commit/d449daaa7e3617f45b0e9927db225ab11e8217a0))
* address review comments on tracing bootstrap and non-Error rejection test ([e0159e0](https://github.com/stritti/nocodb-middleware/commit/e0159e01a1900ae07d58e89638a0c4f6add36140))
* align sdk-trace-base to v2 and fix Promise.reject generic types in spec ([b584d66](https://github.com/stritti/nocodb-middleware/commit/b584d666aa0d18208990068ea2481245de36f066))
* **ci:** fix badges detached HEAD and update package-lock.json on release ([81b3c65](https://github.com/stritti/nocodb-middleware/commit/81b3c65654f108dfd6c481128dd8616a2a729ae8))
* **ci:** skip PR coverage comment for forked PRs to avoid 403 errors ([19fe9c6](https://github.com/stritti/nocodb-middleware/commit/19fe9c603258b0898a8ddc6d9dd2b50e74c2dc63))
* coerce header values to string in NocoDbContextMiddleware ([4c6117f](https://github.com/stritti/nocodb-middleware/commit/4c6117f5d213c578e0d578b79dbf24a8f2f1b6db))
* make enforceRateLimit() concurrency-safe via promise chain (mutex) ([fee69f0](https://github.com/stritti/nocodb-middleware/commit/fee69f041bd17186c499c71dd5065bbab19b76e6))
* narrow module coverage exclusions to keep nocodb.module.ts in tracking ([a289230](https://github.com/stritti/nocodb-middleware/commit/a289230710320c6994809956d99c6f76e7a209ae))
* prevent NocoDB filter injection in findRoleByName() ([134d5b9](https://github.com/stritti/nocodb-middleware/commit/134d5b9a04218565298ab058878de0a666af3baa))
* resolve ExampleRepository table ID via Meta API at startup ([7bf96ba](https://github.com/stritti/nocodb-middleware/commit/7bf96ba3d183cbacee6db166b6cc14d889c89337))
* restore real timers in afterEach and fix rate-limit test assertions for nextAllowedTime behavior ([10325eb](https://github.com/stritti/nocodb-middleware/commit/10325eb1d3c3583bcaef7137d00e6f51c701168a))


### Features

* **ci:** add code coverage reporting, coverage badge, and semver release pipeline ([22af9e2](https://github.com/stritti/nocodb-middleware/commit/22af9e29ae94b8c0940246d145288364c64d367b))
* extend tests to achieve >80% code coverage ([5f77a0e](https://github.com/stritti/nocodb-middleware/commit/5f77a0ecb61a89e8bbe91ce5302ff7dfd064f497))
* initial version containing tests and CI/CD ([ecc0f38](https://github.com/stritti/nocodb-middleware/commit/ecc0f3889b13e9f52ab3a8aae9201621714a9a56))
* integrate OpenTelemetry distributed tracing ([89329da](https://github.com/stritti/nocodb-middleware/commit/89329da7b22f54f066648e228da9957c25f0420f))
* product readiness improvements – security, OpenAPI spec, docs, Swagger annotations ([73ec2b9](https://github.com/stritti/nocodb-middleware/commit/73ec2b995ad9348ac0770beef22bb6690ccf0cd9))
* upgrade all NocoDB API calls from v2 to v3 ([69407a7](https://github.com/stritti/nocodb-middleware/commit/69407a76532caa863668f4be3ce8bf253ac57e4f))
