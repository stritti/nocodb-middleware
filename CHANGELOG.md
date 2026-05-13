## 0.0.2 (2026-05-13)

### Bug Fixes

- address code review – security scheme name, DTO @ApiProperty, Swagger decorators, generate:openapi script ([889053c](https://github.com/stritti/nocodb-middleware/commit/889053c45ecac574b55dec8fb40414e0f789c02b))
- address code review feedback - align security scheme, add @ApiProperty to DTOs, add Swagger decorators to controller, add generate:openapi script ([d2d47ac](https://github.com/stritti/nocodb-middleware/commit/d2d47ac7acd85d5b7c009989590c7f7979385aa5))
- address lint and timer issues in test files ([d449daa](https://github.com/stritti/nocodb-middleware/commit/d449daaa7e3617f45b0e9927db225ab11e8217a0))
- address review comments on tracing bootstrap and non-Error rejection test ([e0159e0](https://github.com/stritti/nocodb-middleware/commit/e0159e01a1900ae07d58e89638a0c4f6add36140))
- align sdk-trace-base to v2 and fix Promise.reject generic types in spec ([b584d66](https://github.com/stritti/nocodb-middleware/commit/b584d666aa0d18208990068ea2481245de36f066))
- **ci:** fix badges detached HEAD and update package-lock.json on release ([81b3c65](https://github.com/stritti/nocodb-middleware/commit/81b3c65654f108dfd6c481128dd8616a2a729ae8))
- **ci:** skip PR coverage comment for forked PRs to avoid 403 errors ([19fe9c6](https://github.com/stritti/nocodb-middleware/commit/19fe9c603258b0898a8ddc6d9dd2b50e74c2dc63))
- coerce header values to string in NocoDbContextMiddleware ([4c6117f](https://github.com/stritti/nocodb-middleware/commit/4c6117f5d213c578e0d578b79dbf24a8f2f1b6db))
- **deps:** resolve transitive dependency vulnerabilities ([#77](https://github.com/stritti/nocodb-middleware/issues/77)) ([94f371c](https://github.com/stritti/nocodb-middleware/commit/94f371c5dacd60329c030db71bf48c4024437018))
- exclude docs/ from NestJS TypeScript build to fix TS7016 error ([edc417e](https://github.com/stritti/nocodb-middleware/commit/edc417e07281c0ad3bc9454875c2bb9359abf7cf))
- linter ([6143fe9](https://github.com/stritti/nocodb-middleware/commit/6143fe92bc237499976150e4ea8d4ac8c74ed6b9))
- make enforceRateLimit() concurrency-safe via promise chain (mutex) ([fee69f0](https://github.com/stritti/nocodb-middleware/commit/fee69f041bd17186c499c71dd5065bbab19b76e6))
- narrow module coverage exclusions to keep nocodb.module.ts in tracking ([a289230](https://github.com/stritti/nocodb-middleware/commit/a289230710320c6994809956d99c6f76e7a209ae))
- obsolete project_id removed ([1d4f4f9](https://github.com/stritti/nocodb-middleware/commit/1d4f4f9ce099eab94a7e22467e43bcd753cac53b))
- prevent NocoDB filter injection in findRoleByName() ([134d5b9](https://github.com/stritti/nocodb-middleware/commit/134d5b9a04218565298ab058878de0a666af3baa))
- project_id renamed to bas_id ([a78b71e](https://github.com/stritti/nocodb-middleware/commit/a78b71efe2f6706f862f2df535dab4ae26006118))
- remove obsolete code ([b1dee88](https://github.com/stritti/nocodb-middleware/commit/b1dee885be2150e7bddfe75488c8f2d273bc516b))
- remove obsolete tests ([b578408](https://github.com/stritti/nocodb-middleware/commit/b578408a25cb39616e23460845e4c2d7dd82e918))
- resolve ExampleRepository table ID via Meta API at startup ([7bf96ba](https://github.com/stritti/nocodb-middleware/commit/7bf96ba3d183cbacee6db166b6cc14d889c89337))
- restore real timers in afterEach and fix rate-limit test assertions for nextAllowedTime behavior ([10325eb](https://github.com/stritti/nocodb-middleware/commit/10325eb1d3c3583bcaef7137d00e6f51c701168a))
- vitepress build errors - openapi.json, dead links, version script ([56991ee](https://github.com/stritti/nocodb-middleware/commit/56991eecb12700f1ae6b095d058ffc5242dafb29))

### Features

- add direct NocoDB user provisioning with pluggable IdP support ([#75](https://github.com/stritti/nocodb-middleware/issues/75)) ([07510c2](https://github.com/stritti/nocodb-middleware/commit/07510c223d6eda968c86090f46f5adf46c17f450))
- add secure idempotent admin bootstrap flow. ([e256999](https://github.com/stritti/nocodb-middleware/commit/e25699901cab05edb85c775070e1b5e3f820f366))
- add VitePress documentation site with GitHub Actions deployment workflow ([ac9b397](https://github.com/stritti/nocodb-middleware/commit/ac9b39711767622a2fc8c9f85aa9f92c1d901a9f))
- add vitepress-openapi plugin to publish OpenAPI spec in docs ([dd6469f](https://github.com/stritti/nocodb-middleware/commit/dd6469f823b33c55de058e2e623102b2faba8669))
- auto-generate openapi.yaml in CI, add CHANGELOG, implement Pino structured logging ([4c01f88](https://github.com/stritti/nocodb-middleware/commit/4c01f88f1dafc1c66c2939579678a8deb33e580a))
- **ci:** add code coverage reporting, coverage badge, and semver release pipeline ([22af9e2](https://github.com/stritti/nocodb-middleware/commit/22af9e29ae94b8c0940246d145288364c64d367b))
- CORS configureable ([f81902d](https://github.com/stritti/nocodb-middleware/commit/f81902d7b0c446d0c04873401b844b2e93283fbc))
- extend tests to achieve >80% code coverage ([5f77a0e](https://github.com/stritti/nocodb-middleware/commit/5f77a0ecb61a89e8bbe91ce5302ff7dfd064f497))
- initial version containing tests and CI/CD ([ecc0f38](https://github.com/stritti/nocodb-middleware/commit/ecc0f3889b13e9f52ab3a8aae9201621714a9a56))
- integrate OpenTelemetry distributed tracing ([89329da](https://github.com/stritti/nocodb-middleware/commit/89329da7b22f54f066648e228da9957c25f0420f))
- logging ([a8aba15](https://github.com/stritti/nocodb-middleware/commit/a8aba157b3ecef6363edfe507e48c5a358157fe6))
- openspec docs created ([fce6ca7](https://github.com/stritti/nocodb-middleware/commit/fce6ca70a9135bd2cfc935074f3e2ec04ed3b832))
- openspec init ([24f43ac](https://github.com/stritti/nocodb-middleware/commit/24f43ac88dbbe99db88e2fd36c6ee7ef68c200a6))
- product readiness improvements – security, OpenAPI spec, docs, Swagger annotations ([73ec2b9](https://github.com/stritti/nocodb-middleware/commit/73ec2b995ad9348ac0770beef22bb6690ccf0cd9))
- skills for nest.js added ([4b907bd](https://github.com/stritti/nocodb-middleware/commit/4b907bd9d900623bff67116c7c2d953211b33d5b))
- switch to @stritti/vitepress-plugin-openspec and fix MIT license footer ([d95e7b1](https://github.com/stritti/nocodb-middleware/commit/d95e7b1d3bbf8a217a7a1da777231c9d1f777911))
- upgrade all NocoDB API calls from v2 to v3 ([69407a7](https://github.com/stritti/nocodb-middleware/commit/69407a76532caa863668f4be3ce8bf253ac57e4f))
- vitepress added ([6ef23c8](https://github.com/stritti/nocodb-middleware/commit/6ef23c88f1bb1f2679315a261964214d050e231a))

### Reverts

- restore vitepress-openapi integration (keep MIT license fix) ([cba4bcc](https://github.com/stritti/nocodb-middleware/commit/cba4bcc349c41676dc046304856a9b00c690309d))

## 0.0.1 (2026-04-06)

### Bug Fixes

- address code review – security scheme name, DTO @ApiProperty, Swagger decorators, generate:openapi script ([889053c](https://github.com/stritti/nocodb-middleware/commit/889053c45ecac574b55dec8fb40414e0f789c02b))
- address code review feedback - align security scheme, add @ApiProperty to DTOs, add Swagger decorators to controller, add generate:openapi script ([d2d47ac](https://github.com/stritti/nocodb-middleware/commit/d2d47ac7acd85d5b7c009989590c7f7979385aa5))
- address lint and timer issues in test files ([d449daa](https://github.com/stritti/nocodb-middleware/commit/d449daaa7e3617f45b0e9927db225ab11e8217a0))
- address review comments on tracing bootstrap and non-Error rejection test ([e0159e0](https://github.com/stritti/nocodb-middleware/commit/e0159e01a1900ae07d58e89638a0c4f6add36140))
- align sdk-trace-base to v2 and fix Promise.reject generic types in spec ([b584d66](https://github.com/stritti/nocodb-middleware/commit/b584d666aa0d18208990068ea2481245de36f066))
- **ci:** fix badges detached HEAD and update package-lock.json on release ([81b3c65](https://github.com/stritti/nocodb-middleware/commit/81b3c65654f108dfd6c481128dd8616a2a729ae8))
- **ci:** skip PR coverage comment for forked PRs to avoid 403 errors ([19fe9c6](https://github.com/stritti/nocodb-middleware/commit/19fe9c603258b0898a8ddc6d9dd2b50e74c2dc63))
- coerce header values to string in NocoDbContextMiddleware ([4c6117f](https://github.com/stritti/nocodb-middleware/commit/4c6117f5d213c578e0d578b79dbf24a8f2f1b6db))
- make enforceRateLimit() concurrency-safe via promise chain (mutex) ([fee69f0](https://github.com/stritti/nocodb-middleware/commit/fee69f041bd17186c499c71dd5065bbab19b76e6))
- narrow module coverage exclusions to keep nocodb.module.ts in tracking ([a289230](https://github.com/stritti/nocodb-middleware/commit/a289230710320c6994809956d99c6f76e7a209ae))
- prevent NocoDB filter injection in findRoleByName() ([134d5b9](https://github.com/stritti/nocodb-middleware/commit/134d5b9a04218565298ab058878de0a666af3baa))
- resolve ExampleRepository table ID via Meta API at startup ([7bf96ba](https://github.com/stritti/nocodb-middleware/commit/7bf96ba3d183cbacee6db166b6cc14d889c89337))
- restore real timers in afterEach and fix rate-limit test assertions for nextAllowedTime behavior ([10325eb](https://github.com/stritti/nocodb-middleware/commit/10325eb1d3c3583bcaef7137d00e6f51c701168a))

### Features

- **ci:** add code coverage reporting, coverage badge, and semver release pipeline ([22af9e2](https://github.com/stritti/nocodb-middleware/commit/22af9e29ae94b8c0940246d145288364c64d367b))
- extend tests to achieve >80% code coverage ([5f77a0e](https://github.com/stritti/nocodb-middleware/commit/5f77a0ecb61a89e8bbe91ce5302ff7dfd064f497))
- initial version containing tests and CI/CD ([ecc0f38](https://github.com/stritti/nocodb-middleware/commit/ecc0f3889b13e9f52ab3a8aae9201621714a9a56))
- integrate OpenTelemetry distributed tracing ([89329da](https://github.com/stritti/nocodb-middleware/commit/89329da7b22f54f066648e228da9957c25f0420f))
- product readiness improvements – security, OpenAPI spec, docs, Swagger annotations ([73ec2b9](https://github.com/stritti/nocodb-middleware/commit/73ec2b995ad9348ac0770beef22bb6690ccf0cd9))
- upgrade all NocoDB API calls from v2 to v3 ([69407a7](https://github.com/stritti/nocodb-middleware/commit/69407a76532caa863668f4be3ce8bf253ac57e4f))
