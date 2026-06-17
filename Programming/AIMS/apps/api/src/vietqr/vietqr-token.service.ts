import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AxiosError } from 'axios';
import { VIETQR_CLIENT, VietqrClient } from './clients/vietqr.client';
import { VietqrConfigService } from './config/vietqr-config.service';

@Injectable()
export class VietqrTokenService {
  private accessToken?: string;
  private accessTokenExpiredAt?: Date;

  constructor(
    @Inject(VIETQR_CLIENT)
    private readonly vietqrClient: VietqrClient,
    private readonly configService: VietqrConfigService,
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.isCachedTokenValid()) {
      return this.accessToken;
    }

    const { username, password } = this.configService.getOutboundCredentials();

    try {
      const response = await this.vietqrClient.getAccessToken(
        username,
        password,
      );

      if (!response.access_token) {
        this.clearAccessToken();
        throw new UnauthorizedException('VietQR authentication failed');
      }

      const expiresIn = response.expires_in || 300;
      this.accessToken = response.access_token;
      this.accessTokenExpiredAt = new Date(Date.now() + expiresIn * 1000);

      return response.access_token;
    } catch (error) {
      this.clearAccessToken();
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('VietQR authentication failed');
    }
  }

  async withAccessTokenRetry<T>(
    operation: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const accessToken = await this.getAccessToken();

    try {
      return await operation(accessToken);
    } catch (error) {
      if (!this.isAuthError(error)) {
        throw error;
      }

      this.clearAccessToken();
      const refreshedToken = await this.getAccessToken();
      return operation(refreshedToken);
    }
  }

  getCachedAccessToken(): string | undefined {
    return this.accessToken;
  }

  private isCachedTokenValid(): boolean {
    if (!this.accessTokenExpiredAt) {
      return false;
    }

    return this.accessTokenExpiredAt.getTime() - Date.now() > 30000;
  }

  private clearAccessToken(): void {
    this.accessToken = undefined;
    this.accessTokenExpiredAt = undefined;
  }

  private isAuthError(error: unknown): boolean {
    const axiosError = error as AxiosError;
    return (
      axiosError?.response?.status === 401 ||
      axiosError?.response?.status === 403
    );
  }
}
