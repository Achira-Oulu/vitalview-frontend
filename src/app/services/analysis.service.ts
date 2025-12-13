// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { from, Observable, switchMap } from 'rxjs';
// import { environment } from '../../environments/environment';
// import { AuthService } from './auth.service';

// @Injectable({ providedIn: 'root' })
// export class AnalysisService {
//   constructor(private http: HttpClient, private auth: AuthService) {}

//   uploadAndAnalyze(file: File): Observable<any> {
//     const formData = new FormData();
//     formData.append('file', file); // MUST match FileInterceptor('file')

//     return from(this.auth.getIdToken()).pipe(
//       switchMap((idToken) =>
//         this.http.post(`${environment.apiBaseUrl}/analysis/upload`, formData, {
//           headers: {
//             Authorization: `Bearer ${idToken}`,
//           },
//         }),
//       ),
//     );
//   }
// }
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  constructor(private http: HttpClient) {}

  // Simple proxy call: file + token -> Nest -> returns {status, result}
  uploadAndAnalyze(file: File, token: string) {
    const formData = new FormData();
    formData.append('file', file); // MUST match FileInterceptor('file')

    return this.http.post(`${environment.apiBaseUrl}/analysis/upload`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
