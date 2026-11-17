import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PublicReadService } from './public-read.service';

@ApiTags('Public resources')
@ApiResponse({
  status: 400,
  description: 'Invalid pagination, configured filter, ID or query parameter',
})
@ApiResponse({
  status: 404,
  description: 'Resource disabled, unknown or record not found',
})
@ApiResponse({
  status: 403,
  description: 'Anonymous role has no read permission on the resource table',
})
@ApiResponse({
  status: 503,
  description: 'Resource configuration or permissions unavailable',
})
@ApiParam({
  name: 'resource',
  description: 'Enabled resource name configured in NocoDB',
})
@Public()
@Controller('public')
export class PublicReadController {
  constructor(private readonly service: PublicReadService) {}

  @Get(':resource')
  @ApiOperation({
    summary: 'List an explicitly authorized configured public resource',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    minimum: 1,
    example: 1,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 50,
    example: 25,
  })
  @ApiOkResponse({
    description:
      'Configured fields in data, with meta: page, take, total and pageCount. Additional query filters are defined by the resource configuration.',
  })
  list(
    @Param('resource') resource: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.list(resource, query);
  }

  @Get(':resource/:id')
  @ApiOperation({
    summary: 'Read an explicitly authorized configured public record',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Positive record ID' })
  @ApiOkResponse({
    description: 'Record ID and explicitly mapped resource fields',
  })
  read(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.read(resource, id, query);
  }
}
