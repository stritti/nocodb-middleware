import { registerAs } from '@nestjs/config';
import { IsString, IsUrl, IsOptional } from 'class-validator';

export class NocoDBConfig {
  @IsUrl()
  apiUrl: string;

  @IsString()
  apiToken: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  baseId: string;

  @IsString()
  @IsOptional()
  tablePrefix?: string;
}

export default registerAs('nocodb', () => ({
  apiUrl: process.env.NOCODB_API_URL,
  apiToken: process.env.NOCODB_API_TOKEN,
  baseId: process.env.NOCODB_BASE_ID,
  tablePrefix: process.env.NOCODB_TABLE_PREFIX || '',
}));
