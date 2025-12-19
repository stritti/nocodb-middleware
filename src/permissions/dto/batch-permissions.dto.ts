import { IsNumber, IsArray, ValidateNested, IsString, IsNotEmpty, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class TablePermissionItem {
    @IsString()
    @IsNotEmpty()
    tableName: string;

    @IsBoolean()
    canCreate: boolean;

    @IsBoolean()
    canRead: boolean;

    @IsBoolean()
    canUpdate: boolean;

    @IsBoolean()
    canDelete: boolean;
}

export class BatchSetPermissionsDto {
    @IsNumber()
    @IsNotEmpty()
    roleId: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TablePermissionItem)
    permissions: TablePermissionItem[];
}
