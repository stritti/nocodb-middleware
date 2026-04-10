import { NocoDBV3Service } from '../nocodb-v3.service';
import { PageOptionsDto } from '../dto/page-options.dto';
import { PageDto } from '../dto/page.dto';
import { PageMetaDto } from '../dto/page-meta.dto';
import { Logger } from '@nestjs/common';

type JsonObject = Record<string, unknown>;

export abstract class BaseRepository<T> {
  protected readonly logger: Logger;

  constructor(
    protected readonly nocoDBV3Service: NocoDBV3Service,
    protected readonly tableId: string,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async findMany(pageOptionsDto: PageOptionsDto): Promise<PageDto<T>> {
    try {
      const response = await this.nocoDBV3Service.list(this.tableId, {
        offset: pageOptionsDto.skip,
        limit: pageOptionsDto.take,
      });

      const list = this.extractList(response).map((item) =>
        this.toRecord(item),
      );
      const total = this.extractTotalRows(response);
      const pageMetaDto = new PageMetaDto({ itemCount: total, pageOptionsDto });

      return new PageDto(list as T[], pageMetaDto);
    } catch (error) {
      this.logger.error(`Error finding many in ${this.tableId}`, error);
      throw error;
    }
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      const result = await this.nocoDBV3Service.create(
        this.tableId,
        data as JsonObject,
      );
      const record = this.toRecord(result);
      if (!record) {
        throw new Error('Failed to create record');
      }
      return record;
    } catch (error) {
      this.logger.error(`Error creating in ${this.tableId}`, error);
      throw error;
    }
  }

  protected toRecord(value: unknown): T | null {
    if (this.isObject(value)) {
      return value as T;
    }
    return null;
  }

  private extractList(response: unknown): unknown[] {
    if (!this.isObject(response)) {
      return [];
    }

    const list = response.list;
    return Array.isArray(list) ? list : [];
  }

  private extractTotalRows(response: unknown): number {
    if (!this.isObject(response)) {
      return 0;
    }

    const pageInfo = response.pageInfo;
    if (this.isObject(pageInfo) && typeof pageInfo.totalRows === 'number') {
      return pageInfo.totalRows;
    }

    return Array.isArray(response.list) ? response.list.length : 0;
  }

  private isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null;
  }
}
