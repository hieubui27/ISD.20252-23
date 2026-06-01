import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthContext {
  private readonly IS_LOGGED_IN_KEY = 'isLoggedIn';
  private loggedInSubject = new BehaviorSubject<boolean>(
    this.checkInitialState(),
  );

  /**
   * Observable representing the current authentication state.
   * Components can subscribe to this to reactively update UI.
   */
  public isLoggedIn$: Observable<boolean> = this.loggedInSubject.asObservable();

  /**
   * Check local storage for initial authentication state on app load.
   */
  private checkInitialState(): boolean {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.IS_LOGGED_IN_KEY) === 'true';
    }
    return false;
  }

  /**
   * Set user as logged in. Updates BehaviorSubject and local storage.
   */
  public setLoggedIn(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.IS_LOGGED_IN_KEY, 'true');
    }
    this.loggedInSubject.next(true);
  }

  /**
   * Set user as logged out. Updates BehaviorSubject and local storage.
   */
  public setLoggedOut(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.IS_LOGGED_IN_KEY);
    }
    this.loggedInSubject.next(false);
  }

  /**
   * Get the current synchronous value of the login state.
   */
  public get isLoggedIn(): boolean {
    return this.loggedInSubject.value;
  }
}
