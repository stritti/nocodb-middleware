import { IsNumber, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({
    description: 'ID of the user to assign the role to',
    example: 42,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'User ID is required' })
  userId: number;

  @ApiProperty({ description: 'ID of the role to assign', example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId: number;
}

export class AssignMultipleRolesDto {
  @ApiProperty({
    description: 'ID of the user to assign the roles to',
    example: 42,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'Array of role IDs to assign',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  roleIds: number[];
}
