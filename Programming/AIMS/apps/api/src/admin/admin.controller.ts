import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUsersDto } from './dto/get-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  IHashServiceToken,
  IHashService,
} from '../common/hashing/hash.service.interface';
import { Inject } from '@nestjs/common';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrator')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IHashServiceToken) private readonly hashService: IHashService,
  ) {}

  @Get()
  async getUsers(@Query() dto: GetUsersDto) {
    const { page = 1, limit = 10, search, status, role } = dto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'All') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role && role !== 'All') {
      where.roles = {
        some: {
          role: {
            roleName: role,
          },
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const mappedData = data.map((user) => ({
      ...user,
      id: user.id.toString(),
      hashedPass: undefined,
      hashedRefreshToken: undefined,
      otp: undefined,
      roles: user.roles.map((r) => r.role.roleName),
    }));

    return { data: mappedData, total };
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      id: user.id.toString(),
      hashedPass: undefined,
      hashedRefreshToken: undefined,
      otp: undefined,
      roles: user.roles.map((r) => r.role.roleName),
    };
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new BadRequestException('Email is already in use');
      }
    }

    const dataToUpdate: any = {};
    if (dto.userName) dataToUpdate.userName = dto.userName;
    if (dto.email) dataToUpdate.email = dto.email;
    if (dto.status) dataToUpdate.status = dto.status;
    if (dto.password) {
      dataToUpdate.hashedPass = await this.hashService.hash(dto.password);
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: BigInt(id) },
        data: dataToUpdate,
      });

      if (dto.roleNames) {
        await tx.userRole.deleteMany({
          where: { userId: BigInt(id) },
        });

        if (dto.roleNames.length > 0) {
          const roles = await tx.role.findMany({
            where: { roleName: { in: dto.roleNames } },
          });

          if (roles.length > 0) {
            await tx.userRole.createMany({
              data: roles.map((role) => ({
                userId: u.id,
                roleId: role.id,
              })),
            });
          }
        }
      }

      return tx.user.findUnique({
        where: { id: u.id },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });
    });

    return {
      message: 'User updated successfully',
      user: {
        ...updatedUser,
        id: updatedUser?.id.toString(),
        hashedPass: undefined,
        hashedRefreshToken: undefined,
        roles: updatedUser?.roles.map((r) => r.role.roleName),
      },
    };
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by setting status to INACTIVE
    await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: { status: 'INACTIVE' },
    });

    return { message: 'User soft-deleted successfully' };
  }
}
