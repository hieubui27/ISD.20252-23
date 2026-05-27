import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:3000/api/auth';

  private http = inject(HttpClient);

  login(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, payload, {
      withCredentials: true,
    });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/request-reset-password`, { email });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/verify-otp`,
      { email, otp: Number(otp) },
      {
        withCredentials: true,
      },
    );
  }

  resetPassword(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset-password`, payload, {
      withCredentials: true,
    });
  }
}
