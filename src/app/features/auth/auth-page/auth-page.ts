// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-auth-page',
//   imports: [],
//   templateUrl: './auth-page.html',
//   styleUrl: './auth-page.css',
// })
// export class AuthPage {

// }
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { FirebaseAuthService } from '../../../core/services/firebase-auth.service'; // adjust path if you moved it
import { AuthStateService } from '../../../core/services/auth-state.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.css',
})
export class AuthPage {
  email = '';
  password = '';
  loginError = '';

  authMode = signal<'login' | 'signup' | 'reset'>('login');

  constructor(
    private firebaseAuth: FirebaseAuthService,
    private authState: AuthStateService,
    private router: Router,
  ) {}

  setMode(mode: 'login' | 'signup' | 'reset') {
    this.authMode.set(mode);
  }

  async handleLogin() {
    this.loginError = '';
    try {
      const token = await this.firebaseAuth.login(this.email, this.password);
      this.authState.setToken(token);
      await this.router.navigateByUrl('/dashboard');
    } catch (err: any) {
      this.loginError = err?.message || 'Login failed';
    }
  }

  async handleSignup() {
    this.loginError = '';
    try {
      const token = await this.firebaseAuth.signup(this.email, this.password);
      this.authState.setToken(token);
      await this.router.navigateByUrl('/dashboard');
    } catch (err: any) {
      this.loginError = err?.message || 'Signup failed';
    }
  }

  async handleResetPassword() {
    this.loginError = '';
    try {
      await this.firebaseAuth.sendPasswordReset(this.email);
      this.loginError = 'Password reset email sent!';
    } catch (err: any) {
      this.loginError = err?.message || 'Failed to send reset email';
    }
  }
}
