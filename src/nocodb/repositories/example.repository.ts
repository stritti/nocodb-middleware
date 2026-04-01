import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRepository } from './base.repository';
import { NocoDBV3Service } from '../nocodb-v3.service';
import { NocoDBService } from '../nocodb.service';

export interface ExampleEntity {
    id: number;
    title: string;
}

@Injectable()
export class ExampleRepository extends BaseRepository<ExampleEntity> implements OnModuleInit {
    private readonly exampleTableName: string;

    constructor(
        nocoDBV3Service: NocoDBV3Service,
        private readonly nocoDBService: NocoDBService,
        configService: ConfigService,
    ) {
        // Pass an empty string initially; the real table ID is resolved in onModuleInit
        super(nocoDBV3Service, '');
        this.exampleTableName =
            configService.get<string>('nocodb.exampleTableName') || 'examples';
    }

    async onModuleInit(): Promise<void> {
        const table = await this.nocoDBService.getTableByName(this.exampleTableName);
        if (!table) {
            throw new Error(
                `ExampleRepository: table '${this.exampleTableName}' not found in NocoDB. ` +
                `Create the table or set NOCODB_EXAMPLE_TABLE_NAME to a valid table name.`,
            );
        }
        this.tableId = table.id;
        this.logger.debug(
            `Resolved table '${this.exampleTableName}' to ID: ${this.tableId}`,
        );
    }
}
