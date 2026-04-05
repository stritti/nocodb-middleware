/**
 * Generate a static openapi.yaml from the NestJS application.
 *
 * Prerequisites: run `npm run build` first.
 *
 * Usage:
 *   npm run generate:openapi
 *
 * The output file `openapi.yaml` is written to the project root and can be
 * committed to version control so that API consumers and tools (e.g. Postman,
 * code generators) can reference the spec without running the server.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
// This is a plain Node.js CJS script – no ts-node required.

process.env.NOCODB_API_URL =
  process.env.NOCODB_API_URL || 'http://localhost:8080';
process.env.NOCODB_API_TOKEN =
  process.env.NOCODB_API_TOKEN || 'dummy-token-for-spec-generation';
process.env.NOCODB_BASE_ID =
  process.env.NOCODB_BASE_ID || 'dummy-base-id-for-spec-generation';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dummy-secret';

const { NestFactory } = require('@nestjs/core');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function resolveAppModule() {
  const candidates = [
    path.resolve(__dirname, '..', 'dist', 'app.module.js'),
    path.resolve(__dirname, '..', 'dist', 'src', 'app.module.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return require(candidate).AppModule;
    }
  }

  throw new Error(
    `Unable to locate compiled AppModule. Run "npm run build" first. Tried: ${candidates.join(', ')}`,
  );
}

const AppModule = resolveAppModule();
async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('NocoDB Middleware API')
    .setDescription(
      'REST API for the NocoDB Middleware – provides JWT-secured access to NocoDB ' +
        'with role-based permissions, caching, rate limiting, and distributed tracing.',
    )
    .setVersion(process.env.npm_package_version ?? '1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addServer('http://localhost:3000', 'Local')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outputPath = path.resolve(__dirname, '..', 'openapi.yaml');
  fs.writeFileSync(outputPath, yaml.dump(document, { lineWidth: 120 }));
  console.log(`OpenAPI spec written to ${outputPath}`);

  await app.close();
}

generate().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
