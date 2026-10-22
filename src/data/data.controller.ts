import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DataService } from './data.service';
import { TablePermissionsGuard } from './table-permissions.guard';
import { ListRecordsQueryDto } from './dto/list-records-query.dto';
import { RECORD_SCHEMA, RecordListDto } from './dto/record-response.dto';

const TABLE_PARAM = {
  name: 'table',
  description: 'Table name in NocoDB (without prefix)',
  example: 'customers',
};

/**
 * Generic CRUD access to user tables. Every request is authorized per table
 * and action by TablePermissionsGuard (OAuth scope or table_permissions).
 */
@ApiTags('data')
@ApiBearerAuth()
@ApiResponse({
  status: 400,
  description: 'Invalid id, query or body (unknown or read-only fields)',
})
@ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
@ApiResponse({ status: 403, description: 'No permission for this table' })
@ApiResponse({ status: 404, description: 'Table or record not found' })
@UseGuards(TablePermissionsGuard)
@Controller('data/:table')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get()
  @ApiOperation({ summary: 'List records of a table' })
  @ApiParam(TABLE_PARAM)
  @ApiOkResponse({ type: RecordListDto, description: 'A page of records' })
  list(@Param('table') table: string, @Query() query: ListRecordsQueryDto) {
    return this.dataService.list(table, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a single record' })
  @ApiParam(TABLE_PARAM)
  @ApiOkResponse({ schema: RECORD_SCHEMA, description: 'The record' })
  read(@Param('table') table: string, @Param('id', ParseIntPipe) id: number) {
    return this.dataService.read(table, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a record' })
  @ApiParam(TABLE_PARAM)
  @ApiBody({ schema: { type: 'object', example: { Name: 'Alice' } } })
  @ApiCreatedResponse({ schema: RECORD_SCHEMA, description: 'Created record' })
  create(@Param('table') table: string, @Body() data: Record<string, unknown>) {
    return this.dataService.create(table, data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a record' })
  @ApiParam(TABLE_PARAM)
  @ApiOkResponse({ schema: RECORD_SCHEMA, description: 'Updated record' })
  @ApiBody({ schema: { type: 'object', example: { Name: 'Bob' } } })
  update(
    @Param('table') table: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Record<string, unknown>,
  ) {
    return this.dataService.update(table, id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a record' })
  @ApiParam(TABLE_PARAM)
  @ApiNoContentResponse({ description: 'Deleted' })
  delete(@Param('table') table: string, @Param('id', ParseIntPipe) id: number) {
    return this.dataService.delete(table, id);
  }
}
