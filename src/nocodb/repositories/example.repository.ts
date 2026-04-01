import { Injectable, OnModuleInit } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { NocoDBV3Service } from '../nocodb-v3.service';
import { NocoDBService } from '../nocodb.service';

export interface ExampleEntity {
    id: number;
    title: string;
}

@Injectable()
export class ExampleRepository extends BaseRepository<ExampleEntity> implements OnModuleInit {
    private readonly tableName = 'examples';

    constructor(
        nocoDBV3Service: NocoDBV3Service,
        private readonly nocoDBService: NocoDBService,
    ) {
        // Pass an empty string initially; the real table ID is resolved in onModuleInit
        super(nocoDBV3Service, '');
    }

    async onModuleInit(): Promise<void> {
        const table = await this.nocoDBService.getTableByName(this.tableName);
        if (!table) {
            throw new Error(
                `ExampleRepository: table '${this.tableName}' not found in NocoDB. ` +
                `Ensure the table exists before starting the application.`,
            );
        }
        this.tableId = table.id;
        this.logger.debug(
            `Resolved table '${this.tableName}' to ID: ${this.tableId}`,
        );
    }
}
