import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExamplesService } from './examples.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { PageOptionsDto } from '../nocodb/dto/page-options.dto';
import { CacheInterceptor } from '../nocodb/interceptors/cache.interceptor';

@ApiTags('examples')
@Controller('examples')
export class ExamplesController {
  constructor(private readonly examplesService: ExamplesService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all examples with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated examples' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.examplesService.findAll(pageOptionsDto);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new example' })
  @ApiResponse({ status: 201, description: 'Example created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createExampleDto: CreateExampleDto) {
    return this.examplesService.create(createExampleDto);
  }
}
