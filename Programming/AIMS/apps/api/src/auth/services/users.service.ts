import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { IUsersService } from '../interfaces/users.service.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import {
  IHashService,
  IHashServiceToken,
} from '../../common/hashing/hash.service.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService implements IUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    @Inject(IHashServiceToken) private readonly hashService: IHashService,
    private readonly configService: ConfigService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    const hashedPass = await this.hashService.hash(createUserDto.password);

    const user = await this.prisma.user.create({
      data: {
        userName: createUserDto.userName,
        email: createUserDto.email,
        hashedPass: hashedPass,
        status: 'ACTIVE',
      },
    });

    if (createUserDto.roleNames && createUserDto.roleNames.length > 0) {
      const roles = await this.prisma.role.findMany({
        where: { roleName: { in: createUserDto.roleNames } },
      });

      if (roles.length > 0) {
        await this.prisma.userRole.createMany({
          data: roles.map((role) => ({
            userId: user.id,
            roleId: role.id,
          })),
        });
      }
    }
    const loginLink = `${this.configService.get<string>('WEB_URL')}/login`;
    await this.mailService.sendInvitation({
      recipientEmail: [createUserDto.email],
      username: createUserDto.userName,
      password: createUserDto.password,
      loginLink,
    });

    return { message: 'Registration successful' };
  }
}
