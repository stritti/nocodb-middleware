import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRepository } from './base.repository';
import { NocoDBService } from '../nocodb.service';

export interface ExampleEntity {
    id: number;
    title: string;
}

@Injectable()
export class ExampleRepository extends BaseRepository<ExampleEntity> {
    constructor(
        nocoDBService: NocoDBService,
        configService: ConfigService,
    ) {
        super(
            nocoDBService,
            'Examples', // Table Name
            configService.get<string>('nocodb.projectId') // Project ID
        );
    }
}
