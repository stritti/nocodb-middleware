import { IsNumber, IsArray, ValidateNested, IsString, IsNotEmpty, IsBoolean, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class TablePermissionItem {
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Table name may only contain alphanumeric characters, underscores, and hyphens' })
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
