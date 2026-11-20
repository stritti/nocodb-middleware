import { registerAs } from '@nestjs/config';

export default registerAs('nocodb', () => ({
  apiUrl: process.env.NOCODB_API_URL,
  apiToken: process.env.NOCODB_API_TOKEN,
  projectId: process.env.NOCODB_PROJECT_ID,
  baseId: process.env.NOCODB_BASE_ID,
  tablePrefix: process.env.NOCODB_TABLE_PREFIX || '',
}));
