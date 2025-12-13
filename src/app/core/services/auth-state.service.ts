import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  token = signal<string | null>(localStorage.getItem('vitalview_token'));

  setToken(token: string) {
    this.token.set(token);
    localStorage.setItem('vitalview_token', token);
  }

  clear() {
    this.token.set(null);
    localStorage.removeItem('vitalview_token');
  }
}


