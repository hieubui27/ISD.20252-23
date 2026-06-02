import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  IAuthServiceToken,
  IAuthService,
} from './interfaces/auth.service.interface';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  NewPasswordDto,
  RequestResetPasswordDto,
  VerifyOtpDto,
} from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(IAuthServiceToken)
    private readonly authService: IAuthService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrator')
  @Post('create-user')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUser(createUserDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(loginDto, res);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    return this.authService.refreshToken(refreshToken, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    // req.user is populated by JwtStrategy
    return req.user;
  }

  @Post('request-reset-password')
  async requestResetPassword(
    @Body() resetPasswordDto: RequestResetPasswordDto,
  ) {
    return this.authService.requestResetPassword(resetPasswordDto);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { message, token } = await this.authService.verifyOtp(verifyOtpDto);
    if (token) {
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('verify_otp_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'strict',
        domain: isProduction ? '.aims.io.vn' : undefined,
        maxAge: 10 * 60 * 1000, // 10 minute
      });
      return { message, token };
    }
    return { message };
  }

  @Post('reset-password')
  async resetPassword(
    @Body() dto: NewPasswordDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const verifyOtpToken = req.cookies['verify_otp_token'];

    const result = await this.authService.resetPassword(dto, verifyOtpToken);
    res.clearCookie('verify_otp_token');
    return result;
  }
}
