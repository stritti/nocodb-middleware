import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRepository } from './base.repository';
import { NocoDBV3Service } from '../nocodb-v3.service';

export interface ExampleEntity {
    id: number;
    title: string;
}

@Injectable()
export class ExampleRepository extends BaseRepository<ExampleEntity> {
    constructor(
        nocoDBV3Service: NocoDBV3Service,
        configService: ConfigService,
    ) {
        super(
            nocoDBV3Service,
            configService.get<string>('nocodb.exampleTableId') || 'Examples',
        );
    }
}
