import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, User, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
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

  async signup(email: string, password: string): Promise<string> {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    return await userCredential.user.getIdToken();
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }
}
