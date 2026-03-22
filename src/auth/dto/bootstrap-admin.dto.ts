import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsEmail,
  Matches,
} from 'class-validator';

export class BootstrapAdminDto {
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  username: string;

  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      'Password must include uppercase, lowercase, number and special character',
  })
  password: string;
}
