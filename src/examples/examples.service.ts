import { Injectable } from '@nestjs/common';
import { ExampleRepository } from '../nocodb/repositories/example.repository';
import { CreateExampleDto } from './dto/create-example.dto';
import { UpdateExampleDto } from './dto/update-example.dto';
import { PageOptionsDto } from '../nocodb/dto/page-options.dto';

@Injectable()
export class ExamplesService {
  constructor(private readonly exampleRepository: ExampleRepository) {}

  async findAll(pageOptionsDto: PageOptionsDto) {
    return this.exampleRepository.findMany(pageOptionsDto);
  }

  async create(createExampleDto: CreateExampleDto) {
    return this.exampleRepository.create(createExampleDto);
  }

  // Add findOne, update, delete methods as needed
}
