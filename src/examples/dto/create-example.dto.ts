import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateExampleDto {
    @ApiProperty({ description: 'Title of the example', example: 'My Example' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    title: string;
}
