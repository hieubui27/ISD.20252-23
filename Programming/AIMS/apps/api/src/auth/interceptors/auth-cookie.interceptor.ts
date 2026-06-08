import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { CookieConfig } from '../../common/utils/cookie.util';
import { AuthResponse } from '../dto/auth-response.dto';

@Injectable()
export class AuthCookieInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((result) => {
        if (result instanceof AuthResponse) {
          const ctx = context.switchToHttp();
          const response = ctx.getResponse<Response>();

          // Xử lý clear cookies
          if (result.clearCookies && result.clearCookies.length > 0) {
            result.clearCookies.forEach((cookieName) => {
              response.clearCookie(cookieName, CookieConfig.getOptions());
            });
          }

          // Xử lý set cookies
          if (result.setCookies && result.setCookies.length > 0) {
            result.setCookies.forEach((cookie) => {
              response.cookie(
                cookie.name,
                cookie.value,
                CookieConfig.getOptions(cookie.maxAge),
              );
            });
          }

          // Trả về payload cho client
          return result.payload;
        }

        // Fallback cho các trường hợp không dùng AuthResponse
        return result;
      }),
    );
  }
}
