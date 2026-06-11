import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AIMS_API_BASE_URL } from '../../core/api/api.config';

export interface UserRole {
  roleId: string;
  roleName: string;
}

export interface User {
  id: string;
  userName: string;
  email: string;
  status: string;
  roles: string[];
}

export interface PaginatedUsers {
  data: User[];
  total: number;
}

export interface UserFilters {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly baseUrl = `${AIMS_API_BASE_URL}/admin/users`;
  private http = inject(HttpClient);

  getUsers(filters: UserFilters): Observable<PaginatedUsers> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('limit', filters.limit);

    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.role) params = params.set('role', filters.role);

    return this.http.get<PaginatedUsers>(this.baseUrl, {
      params,
      withCredentials: true,
    });
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`, {
      withCredentials: true,
    });
  }

  createUser(data: any): Observable<any> {
    // Uses the existing auth endpoint for user creation since it does not exist under admin
    return this.http.post(`${AIMS_API_BASE_URL}/auth/create-user`, data, {
      withCredentials: true,
    });
  }

  updateUser(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data, {
      withCredentials: true,
    });
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, {
      withCredentials: true,
    });
  }
}
