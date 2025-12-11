import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const ANALYSIS_API =
  'https://analysis-manager-glymphaticresearch.2.rahtiapp.fi/analysis';

export interface PresignResponse {
  url: string;
  fields: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  constructor(private http: HttpClient) {}

  // 1) POST /analysis -> get S3 presign data
  async getAnalysisUploadFields(
    token: string,
    outputFormat = 'json',
  ): Promise<PresignResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    const body = { outputFormat };

    return await firstValueFrom(
      this.http.post<PresignResponse>(ANALYSIS_API, body, { headers }),
    );
  }

  // 2) Upload the file to S3 using the presigned form
  async uploadAnalysisFile(file: File, presign: PresignResponse): Promise<void> {
    const formData = new FormData();

    // Add all presigned fields
    Object.entries(presign.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // S3 expects the file here
    formData.append('file', file);

    await firstValueFrom(
      this.http.post(presign.url, formData, {
        responseType: 'text', // S3 usually returns XML or empty
      }),
    );
  }

  // 3) Poll for result: GET /analysis/{key}?outputFormat=json
  async fetchAnalysisResult(
    key: string,
    token: string,
  ): Promise<{ pending: true } | any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const url = `${ANALYSIS_API}/${encodeURIComponent(key)}?outputFormat=json`;

    try {
      const res = await firstValueFrom(this.http.get<any>(url, { headers }));
      return res;
    } catch (err: any) {
      if (err.status === 404) {
        // still processing
        return { pending: true };
      }
      throw new Error(
        `Failed to fetch analysis: ${err.status} ${err.message ?? ''}`,
      );
    }
  }

  // 4) If polling result returns a JSON URL, fetch it
  async fetchAnalysisJson(resultUrl: string): Promise<any> {
    return await firstValueFrom(this.http.get<any>(resultUrl));
  }

  // 5) High-level wrapper: Presign → Upload → Poll → Get JSON
  async analyzeFileWithPolling(
    file: File,
    token: string,
    fileName: string,
    maxRetries = 10,
    delayMs = 3000,
  ): Promise<any> {
    // Step 1: get presigned upload fields
    const presign = await this.getAnalysisUploadFields(token, 'json');

    // Step 2: upload file to S3
    await this.uploadAnalysisFile(file, presign);

    // Step 3: get S3 key
    const key = presign.fields['key'] ?? presign.fields['Key'];
    if (!key) {
      throw new Error('Presign response missing S3 key');
    }

    // Step 4: poll until ready
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await this.fetchAnalysisResult(key, token);

      if ((result as any).pending) {
        await new Promise((res) => setTimeout(res, delayMs));
        continue;
      }

      // If result has `url`, download JSON from there
      if (result.url) {
        const data = await this.fetchAnalysisJson(result.url);

        // Mimic Expo checks
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          throw new Error(`Analysis errors: ${JSON.stringify(data.errors)}`);
        }
        if (data.result?.error) {
          throw new Error(`Analysis failed: ${data.result.error}`);
        }

        return data;
      }

      // Otherwise assume result itself is the JSON
      return result;
    }

    throw new Error('Analysis timed out');
  }
}
