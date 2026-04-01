import { NocoDBV3Service, FilterOptions } from '../nocodb-v3.service';
import { PageOptionsDto } from '../dto/page-options.dto';
import { PageDto } from '../dto/page.dto';
import { PageMetaDto } from '../dto/page-meta.dto';
import { Logger } from '@nestjs/common';

export abstract class BaseRepository<T> {
    protected readonly logger: Logger;
    protected tableId: string;

    constructor(
        protected readonly nocoDBV3Service: NocoDBV3Service,
        tableId: string,
    ) {
        this.tableId = tableId;
        this.logger = new Logger(this.constructor.name);
    }

    async findMany(pageOptionsDto: PageOptionsDto): Promise<PageDto<T>> {
        try {
            const options: FilterOptions = {
                limit: pageOptionsDto.take,
                offset: pageOptionsDto.skip,
            };

            const result = await this.nocoDBV3Service.list(this.tableId, options);

            const data = (result.list || []) as T[];
            const count = result.pageInfo?.totalRows || 0;

            const pageMetaDto = new PageMetaDto({ itemCount: count, pageOptionsDto });
            return new PageDto(data, pageMetaDto);
        } catch (error) {
            this.logger.error(`Error finding many in ${this.tableId}`, error);
            throw error;
        }
    }

    async findOne(where: string): Promise<T | null> {
        try {
            const result = await this.nocoDBV3Service.findOne(this.tableId, where);
            return result as T | null;
        } catch (error) {
            this.logger.error(`Error finding one in ${this.tableId}`, error);
            throw error;
        }
    }

    async create(data: Partial<T>): Promise<T> {
        try {
            const result = await this.nocoDBV3Service.create(this.tableId, data);
            return result as T;
        } catch (error) {
            this.logger.error(`Error creating in ${this.tableId}`, error);
            throw error;
        }
    }

    async update(id: number, data: Partial<T>): Promise<T> {
        try {
            const result = await this.nocoDBV3Service.update(this.tableId, id, data);
            return result as T;
        } catch (error) {
            this.logger.error(`Error updating record ${id} in ${this.tableId}`, error);
            throw error;
        }
    }

    async delete(id: number): Promise<void> {
        try {
            await this.nocoDBV3Service.delete(this.tableId, id);
        } catch (error) {
            this.logger.error(`Error deleting record ${id} in ${this.tableId}`, error);
            throw error;
        }
    }
}
