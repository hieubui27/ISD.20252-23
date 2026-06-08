export class CookieSetting {
  name: string;
  value: string;
  maxAge?: number;
}

export class AuthResponse {
  constructor(
    public readonly payload: any,
    public readonly clearCookies: string[] = [],
    public readonly setCookies: CookieSetting[] = [],
  ) {}
}
