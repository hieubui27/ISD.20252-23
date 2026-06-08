import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Inject,
  UseInterceptors,
} from '@nestjs/common';
import {
  IAuthServiceToken,
  IAuthService,
} from './interfaces/auth.service.interface';
import {
  IOtpServiceToken,
  IOtpService,
} from './interfaces/otp.service.interface';
import {
  IUsersServiceToken,
  IUsersService,
} from './interfaces/users.service.interface';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  NewPasswordDto,
  RequestResetPasswordDto,
  VerifyOtpDto,
} from './dto/forgot-password.dto';
import { AuthCookieInterceptor } from './interceptors/auth-cookie.interceptor';
import { Cookies } from '../common/decorators/cookies.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthResponse } from './dto/auth-response.dto';

@UseInterceptors(AuthCookieInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(IAuthServiceToken)
    private readonly authService: IAuthService,
    @Inject(IOtpServiceToken)
    private readonly otpService: IOtpService,
    @Inject(IUsersServiceToken)
    private readonly usersService: IUsersService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrator')
  @Post('create-user')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return new AuthResponse(
      result,
      [],
      [
        {
          name: 'access_token',
          value: result.accessToken,
          maxAge: 15 * 60 * 1000,
        },
        {
          name: 'refresh_token',
          value: result.refreshToken,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      ],
    );
  }

  @Post('logout')
  async logout() {
    const result = await this.authService.logout();
    return new AuthResponse(result, ['access_token', 'refresh_token']);
  }

  @Post('refresh')
  async refresh(@Cookies('refresh_token') refreshToken: string) {
    const result = await this.authService.refreshToken(refreshToken);
    return new AuthResponse(
      result,
      [],
      [
        {
          name: 'access_token',
          value: result.accessToken,
          maxAge: 15 * 60 * 1000,
        },
        {
          name: 'refresh_token',
          value: result.refreshToken,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      ],
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  @Post('request-reset-password')
  async requestResetPassword(
    @Body() resetPasswordDto: RequestResetPasswordDto,
  ) {
    return this.otpService.requestResetPassword(resetPasswordDto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const result = await this.otpService.verifyOtp(verifyOtpDto);
    return new AuthResponse(
      result,
      [],
      [
        {
          name: 'verify_otp_token',
          value: result.token,
          maxAge: 10 * 60 * 1000,
        },
      ],
    );
  }

  @Post('reset-password')
  async resetPassword(
    @Body() dto: NewPasswordDto,
    @Cookies('verify_otp_token') verifyOtpToken: string,
  ) {
    const result = await this.otpService.resetPassword(dto, verifyOtpToken);
    return new AuthResponse(result, ['verify_otp_token']);
  }
}
