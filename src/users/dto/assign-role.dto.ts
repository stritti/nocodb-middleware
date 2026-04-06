import { IsNumber, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ example: 42, description: 'Numeric user ID' })
  @IsNumber()
  @IsNotEmpty({ message: 'User ID is required' })
  userId: number;

  @ApiProperty({ example: 1, description: 'Numeric role ID' })
  @IsNumber()
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId: number;
}

export class AssignMultipleRolesDto {
  @ApiProperty({ example: 42, description: 'Numeric user ID' })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    example: [1, 2, 3],
    description: 'Array of numeric role IDs to assign',
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  roleIds: number[];
}
