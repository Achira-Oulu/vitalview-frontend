import { Injectable } from '@angular/core';
import { signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from '../../firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private user: User | null = null;

  async login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    this.user = cred.user;
  }

  async logout(): Promise<void> {
    await signOut(auth);
    this.user = null;
  }

  async getIdToken(): Promise<string> {
    const current = this.user ?? auth.currentUser;
    if (!current) throw new Error('Not logged in');
    return current.getIdToken(); // Firebase ID token
  }
}
