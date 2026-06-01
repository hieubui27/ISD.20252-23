import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, of, catchError } from 'rxjs';
import { AIMS_API_BASE_URL } from '../core/api/api.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = `${AIMS_API_BASE_URL}/auth`;
  private http = inject(HttpClient);

  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

  // To avoid multiple /me requests
  private _hasFetchedMe = false;

  fetchMe(): Observable<any> {
    if (this._hasFetchedMe && this.userSubject.getValue()) {
      return of(this.userSubject.getValue());
    }
    return this.http.get(`${this.baseUrl}/me`).pipe(
      tap((user) => {
        this.userSubject.next(user);
        this._hasFetchedMe = true;
      }),
      catchError(() => {
        this.userSubject.next(null);
        this._hasFetchedMe = true;
        return of(null);
      }),
    );
  }

  hasRole(role: string): boolean {
    const user = this.userSubject.getValue();
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  refreshToken(): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/refresh`,
      {},
      { withCredentials: true },
    );
  }

  logoutLocal(): void {
    this.userSubject.next(null);
    this._hasFetchedMe = false;
  }

  login(payload: any): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/login`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          // Reset state so next fetchMe() hits the API
          this._hasFetchedMe = false;
        }),
      );
  }

  logout(): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/logout`,
      {},
      {
        withCredentials: true,
      },
    );
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
