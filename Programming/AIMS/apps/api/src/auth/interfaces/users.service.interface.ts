import { CreateUserDto } from '../dto/create-user.dto';

export interface IUsersService {
  createUser(createUserDto: CreateUserDto): Promise<{ message: string }>;
}

export const IUsersServiceToken = Symbol('IUsersService');
