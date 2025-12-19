import { HttpException, HttpStatus } from '@nestjs/common';

export class NocoDBException extends HttpException {
    constructor(message: string, status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
        super(
            {
                statusCode: status,
                message: message,
                error: 'NocoDB Error',
            },
            status,
        );
    }

    static tableNotFound(tableName: string) {
        return new NocoDBException(`Table '${tableName}' not found`, HttpStatus.NOT_FOUND);
    }

    static recordNotFound(tableName: string, id: string | number) {
        return new NocoDBException(`Record with ID '${id}' not found in table '${tableName}'`, HttpStatus.NOT_FOUND);
    }

    static unauthorized(message = 'Unauthorized access to NocoDB') {
        return new NocoDBException(message, HttpStatus.UNAUTHORIZED);
    }
}
