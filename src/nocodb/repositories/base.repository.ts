import { NocoDBService } from '../nocodb.service';
import { PageOptionsDto } from '../dto/page-options.dto';
import { PageDto } from '../dto/page.dto';
import { PageMetaDto } from '../dto/page-meta.dto';
import { Logger } from '@nestjs/common';

export abstract class BaseRepository<T> {
  protected readonly logger: Logger;

  constructor(
    protected readonly nocoDBService: NocoDBService,
    protected readonly tableName: string,
    protected readonly projectId?: string,
    protected readonly viewId?: string,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  protected get client() {
    return this.nocoDBService.getClient();
  }

  // Helper to get dbViewRow method which is common for table operations
  // Note: nocodb-sdk types might vary, adjusting for generic usage
  protected get tableApi() {
    // Assuming project ID is available or configured globally/per repo
    // If projectId is not passed, we might need to rely on how the SDK is initialized or pass it in methods
    // For this implementation, we assume we are using the table-centric APIs if possible,
    // or we construct the requests manually if the SDK requires specific project IDs.

    // The SDK structure: client.dbViewRow.list(projectId, tableId, ...)
    // We need projectId.
    if (!this.projectId) {
      // Fallback or error if project ID is strictly required for the calls we make
      // For now, let's assume it's passed in constructor or config
    }
    return this.client.dbViewRow;
  }

  async findMany(pageOptionsDto: PageOptionsDto): Promise<PageDto<T>> {
    try {
      const projectId = this.projectId || 'default_project_id'; // Replace with actual config retrieval if needed
      const dbViewRow = this.client.dbViewRow as any;

      const result = await dbViewRow.list(
        projectId,
        this.tableName,
        this.viewId,
        {
          offset: pageOptionsDto.skip,
          limit: pageOptionsDto.take,
          // sort: ... map order
        },
      );

      const data = result.list as T[];
      const count = result.pageInfo.totalRows || 0;

      const pageMetaDto = new PageMetaDto({ itemCount: count, pageOptionsDto });
      return new PageDto(data, pageMetaDto);
    } catch (error) {
      this.logger.error(`Error finding many in ${this.tableName}`, error);
      throw error;
    }
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      const projectId = this.projectId || 'default_project_id';
      const dbViewRow = this.client.dbViewRow as any;
      const result = await dbViewRow.create(
        projectId,
        this.tableName,
        this.viewId,
        data,
      );
      return result as T;
    } catch (error) {
      this.logger.error(`Error creating in ${this.tableName}`, error);
      throw error;
    }
  }

  // Add findOne, update, delete as needed
}
