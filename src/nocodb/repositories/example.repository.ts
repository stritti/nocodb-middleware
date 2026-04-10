import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { NocoDBV3Service } from '../nocodb-v3.service';

export interface ExampleEntity {
  id: number;
  title: string;
}

@Injectable()
export class ExampleRepository extends BaseRepository<ExampleEntity> {
  constructor(nocoDBV3Service: NocoDBV3Service) {
    super(nocoDBV3Service, 'Examples'); // Table Name
  }
}
