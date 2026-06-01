import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsString,
  IsArray,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Username cannot be empty' })
  userName: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email: string;

  @IsNotEmpty({ message: 'Password cannot be empty' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleNames?: string[];
}
