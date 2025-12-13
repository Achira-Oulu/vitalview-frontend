import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { JsonPipe, DecimalPipe, CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

import { FormsModule } from '@angular/forms';
import { FirebaseAuthService,  } from './firebase-auth.service';
// import { AnalysisService } from './analysis.service';
import { AnalysisService } from './services/analysis.service';
import { firstValueFrom } from 'rxjs';




type MetricId = 'heartrate' | 'gindex' | 'brainPulsatility';

interface MetricTab {
  id: MetricId;
  label: string;
  color: string; // tailwind color class base (e.g. 'rose', 'indigo')
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, JsonPipe, DecimalPipe, FormsModule ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  // App title (if you want to use it somewhere)
  protected readonly title = signal('VitalView');
  private readonly API_BASE = 'https://vitalview-backend.onrender.com';

  // Login fields
  email = '';
  password = '';
  token: string | null = null;
  loginError = '';

  // Inject Firebase
  constructor(
    private http: HttpClient,
    private auth: FirebaseAuthService,
    private analysis: AnalysisService,
  ) {}

  // Signal for login mode 
  authMode = signal<'login' | 'signup' | 'reset'>('login');



  // File analysis state
  selectedFile: File | null = null;
  analysisStatus = signal<'idle' | 'uploading' | 'processing' | 'done' | 'error'>(
    'idle',
  );
  analysisMessage = signal<string | null>(null);
  analysisResult: any | null = null;

  setMode(mode: 'login' | 'signup' | 'reset') {
    this.authMode.set(mode);
  }

  async handleSignup() {
    this.loginError = '';
    try {
      const token = await this.auth.signup(this.email, this.password);
      this.token = token;
      localStorage.setItem('vitalview_token', token);
    } catch (err: any) {
      this.loginError = err.message || 'Signup failed';
    }
  }

  async handleResetPassword() {
    this.loginError = '';
    try {
      await this.auth.sendPasswordReset(this.email);
      this.loginError = 'Password reset email sent!';
    } catch (err: any) {
      this.loginError = err.message || 'Failed to send reset email';
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem('vitalview_token');
    // Optional: reset auth mode & fields
    this.authMode.set('login');
    this.email = '';
    this.password = '';
  }



  async handleLogin() {
    this.loginError = '';
    try {
      this.token = await this.auth.login(this.email, this.password);
      console.log("Firebase token:", this.token);
    } catch (err: any) {
      this.loginError = err.message || "Login failed";
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;

    this.analysisResult = null;
    this.analysisStatus.set('idle');
    this.analysisMessage.set(
      file ? `Selected file: ${file.name}` : 'No file selected',
    );
  }

// async analyzeSelectedFile() {
//   if (!this.token) {
//     this.analysisStatus.set('error');
//     this.analysisMessage.set('You must be logged in to analyze files.');
//     return;
//   }

//   if (!this.selectedFile) {
//     this.analysisStatus.set('error');
//     this.analysisMessage.set('Please select a .001 file first.');
//     return;
//   }

//   this.analysisStatus.set('uploading');
//   this.analysisMessage.set('Uploading file and starting analysis…');

//   try {
//     const result = await this.analysis.analyzeFileWithPolling(
//       this.selectedFile,
//       this.token,
//       this.selectedFile.name,
//       10,
//       3000,
//     );

//     console.log('Analysis result JSON:', result);

//     this.analysisResult = result;
//     this.analysisStatus.set('done');
//     this.analysisMessage.set('Analysis completed. See JSON below.');
//   } catch (err: any) {
//     console.error('Analysis error', err);
//     this.analysisStatus.set('error');
//     this.analysisMessage.set(err.message || 'Analysis failed.');
//   }
// }
async analyzeSelectedFile() {
  if (!this.token) {
    this.analysisStatus.set('error');
    this.analysisMessage.set('You must be logged in to analyze files.');
    return;
  }

  if (!this.selectedFile) {
    this.analysisStatus.set('error');
    this.analysisMessage.set('Please select a .001 file first.');
    return;
  }

  this.analysisStatus.set('uploading');
  this.analysisMessage.set('Uploading file and starting analysis…');

  try {
    const resp: any = await firstValueFrom(
      this.analysis.uploadAndAnalyze(this.selectedFile, this.token)
    );

    // resp is { status: 'ok', result: {...} }
    this.analysisResult = resp.result;
    this.analysisStatus.set('done');
    this.analysisMessage.set('Analysis completed. See JSON below.');
  } catch (err: any) {
    console.error('Analysis error', err);
    this.analysisStatus.set('error');
    this.analysisMessage.set(
      err?.error?.message || err?.message || 'Analysis failed.'
    );
  }
}






  // Tabs for the 3 metrics
  readonly metricTabs: MetricTab[] = [
    { id: 'heartrate',        label: 'Heart rate',         color: 'rose' },
    { id: 'gindex',           label: 'G-index',            color: 'emerald' },
    { id: 'brainPulsatility', label: 'Brain pulsatility',  color: 'indigo' },
  ];

  // All metric data, keyed by id
  metrics = signal<Record<MetricId, any>>({
    heartrate: null,
    gindex: null,
    brainPulsatility: null,
  });

  // Which metric is currently selected
  selectedMetricId = signal<MetricId>('heartrate');

  // UI state
  loading = signal(true);
  error = signal<string | null>(null);

  // Chart.js instance
  private chart?: Chart;

  // Convenience computed values
  currentMetric = computed(() => this.metrics()[this.selectedMetricId()]);
  currentTab = computed(
    () => this.metricTabs.find((t) => t.id === this.selectedMetricId())!
  );

  // constructor(private http: HttpClient) {}     

  // ngOnInit(): void {
  //   // Fetch all three metrics
  //   this.fetchMetric('heartrate', 'http://localhost:3000/metrics/heartrate', true);
  //   this.fetchMetric('gindex', 'http://localhost:3000/metrics/gindex');
  //   this.fetchMetric(
  //     'brainPulsatility',
  //     'http://localhost:3000/metrics/brain-pulsatility'
  //   );
  // }
  
  ngOnInit(): void {
    // Fetch all three metrics using the API_BASE variable
    this.fetchMetric('heartrate', `${this.API_BASE}/metrics/heartrate`, true);
    this.fetchMetric('gindex', `${this.API_BASE}/metrics/gindex`);
    this.fetchMetric('brainPulsatility', `${this.API_BASE}/metrics/brain-pulsatility`);
  }
  

  // Fetch a single metric by id
  private fetchMetric(id: MetricId, url: string, buildInitialChart = false) {
    this.http.get<any>(url).subscribe({
      next: (data) => {
        this.metrics.update((curr) => ({
          ...curr,
          [id]: data,
        }));

        if (id === 'heartrate' && buildInitialChart) {
          this.loading.set(false);
          this.buildChart(id, data);
        }
      },
      error: (err) => {
        console.error(`Error fetching ${id}`, err);
        this.error.set(`Failed to load ${id} data`);
        this.loading.set(false);
      },
    });
  }

  // Called when the user selects a metric tab
  onSelectMetric(id: MetricId) {
    this.selectedMetricId.set(id);
    const metric = this.metrics()[id];
    if (metric) {
      this.buildChart(id, metric);
    }
  }
  


//scrllable only with heartrate
private buildChart(id: MetricId, metric: any) {
  const canvas = document.getElementById('metricChart') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element #metricChart not found');
    return;
  }

  const measurements: any[] = metric?.measurements ?? [];
  if (!measurements.length) {
    console.warn('No measurements for metric', id);
    return;
  }

  // Adjust width of inner wrapper only for heartrate with many samples
  const wrapper = canvas.parentElement as HTMLDivElement | null;
  if (wrapper) {
    if (id === 'heartrate' && measurements.length > 100) {
      const factor = measurements.length / 100; // e.g. 300 samples -> factor 3
      const baseWidth = 900; // px for ~100 samples
      wrapper.style.width = `${Math.round(baseWidth * factor)}px`;
    } else {
      // For other metrics or fewer samples, let Tailwind classes handle width
      wrapper.style.width = '';
    }
  }

  // x-axis: time in seconds if available, otherwise index
  const hasTime = 'time' in measurements[0];
  const labels = measurements.map((m, index) =>
    hasTime ? `${(m.time / 1000).toFixed(0)}s` : `${index}`
  );

  // y-axis: pick a numeric field that is not 'time' or 'hrv'
  const sample = measurements[0];
  const valueKey =
    Object.keys(sample).find(
      (k) =>
        k !== 'time' &&
        k !== 'hrv' &&
        typeof sample[k] === 'number'
    ) ?? 'rate';

  const values = measurements.map((m) => m[valueKey]);

  // Axis labels
  const xLabel = hasTime ? 'Time (s)' : 'Sample index';

  let yLabel = 'Value';
  switch (id) {
    case 'heartrate':
      yLabel = 'Heart rate (bpm)';
      break;
    case 'brainPulsatility':
      yLabel = 'Brain pulsatility (%)';
      break;
    case 'gindex':
      yLabel = 'G-index';
      break;
  }

  // Colors per metric
  let borderColor = 'rgba(15, 23, 42, 1)'; // default slate-900
  let backgroundColor = 'rgba(15, 23, 42, 0.12)';

  switch (id) {
    case 'heartrate':
      borderColor = 'rgba(244, 63, 94, 1)';    // rose-500
      backgroundColor = 'rgba(244, 63, 94, 0.15)';
      break;
    case 'gindex':
      borderColor = 'rgba(16, 185, 129, 1)';   // emerald-500
      backgroundColor = 'rgba(16, 185, 129, 0.15)';
      break;
    case 'brainPulsatility':
      borderColor = 'rgba(129, 140, 248, 1)';  // indigo-400/500
      backgroundColor = 'rgba(129, 140, 248, 0.15)';
      break;
  }

  // Destroy previous chart to avoid duplicates
  if (this.chart) {
    this.chart.destroy();
  }

  this.chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: this.currentTab().label,
          data: values,
          borderWidth: 2,
          tension: 0.3,
          borderColor,
          backgroundColor,
          pointRadius: 0, // smoother curve, no noisy dots
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // respect the 320px height wrapper
      scales: {
        x: {
          title: {
            display: true,
            text: xLabel,
          },
        },
        y: {
          title: {
            display: true,
            text: yLabel,
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,   //  makes legend show a line-circle instead of a square
            pointStyle: 'line'     // ensures it's a line symbol
          }
        }
      }
    },
  });
}



  // Safely read a trend average if present
  getTrendAverage(metric: any): number | null {
    if (!metric?.trends) return null;

    // Try common keys
    if (metric.trends.rate?.average != null) return metric.trends.rate.average;
    if (metric.trends.hrv?.average != null) return metric.trends.hrv.average;

    // Fall back to any "average" inside trends
    const firstKey = Object.keys(metric.trends)[0];
    if (firstKey && metric.trends[firstKey]?.average != null) {
      return metric.trends[firstKey].average;
    }

    return null;
  }

    getTrendEntries(metricId: MetricId, metric: any): { label: string; value: number; unit: string }[] {
    if (!metric?.trends) return [];

    const entries: { label: string; value: number; unit: string }[] = [];

    for (const key of Object.keys(metric.trends)) {
      const trend = metric.trends[key];
      if (!trend || typeof trend.average !== 'number') continue;

      // Default label = key, capitalized a bit
      const prettyLabel = key === 'rate'
        ? 'Average rate'
        : key === 'hrv'
          ? 'Average HRV'
          : `Average ${key}`;

      // Decide units based on metric + key
      let unit = '';

      if (metricId === 'heartrate') {
        if (key === 'rate') unit = 'bpm';
        else if (key === 'hrv') unit = metric.units?.hrv ?? 'ms';
      } else if (metricId === 'brainPulsatility') {
        unit = '%';
      } else if (metricId === 'gindex') {
        unit = 'index';
      }

      entries.push({
        label: prettyLabel,
        value: trend.average,
        unit,
      });
    }

    return entries;
  }

}
