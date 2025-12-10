import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, User } from 'firebase/auth';
import { firebaseConfig } from '../firebase-config';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private app = initializeApp(firebaseConfig);
  private auth = getAuth(this.app);
  user: User | null = null;

  async login(email: string, password: string): Promise<string> {
    const result = await signInWithEmailAndPassword(this.auth, email, password);
    this.user = result.user;
    const token = await result.user.getIdToken(); // Firebase ID token
    return token;
  }
}
