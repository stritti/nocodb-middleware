import { Module } from '@nestjs/common';
import { ExamplesController } from './examples.controller';
import { ExamplesService } from './examples.service';
import { ExampleRepository } from '../nocodb/repositories/example.repository';

/**
 * Demo module. Not part of AppModule: its repository requires an `examples`
 * table and would otherwise prevent the middleware from starting.
 */
@Module({
  controllers: [ExamplesController],
  providers: [ExamplesService, ExampleRepository],
})
export class ExamplesModule {}
