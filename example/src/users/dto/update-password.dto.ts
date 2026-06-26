import { IsString, MinLength, Matches } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'New password must contain uppercase, lowercase, and numeric characters',
  })
  newPassword!: string;
}
