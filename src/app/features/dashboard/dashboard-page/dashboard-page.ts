// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-dashboard-page',
//   imports: [],
//   templateUrl: './dashboard-page.html',
//   styleUrl: './dashboard-page.css',
// })
// export class DashboardPage {

// }

import { Component, OnInit, computed, signal, afterNextRender, inject, Injector, runInInjectionContext  } from '@angular/core';
import { CommonModule, DecimalPipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Chart from 'chart.js/auto';
import { firstValueFrom } from 'rxjs';


import { AuthStateService } from '../../../core/services/auth-state.service';
import { AnalysisService } from '../../../core/services/analysis.service';

type MetricId = 'heartrate' | 'gindex' | 'brainPulsatility';

interface MetricTab {
  id: MetricId;
  label: string;
  color: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, JsonPipe, DecimalPipe, FormsModule],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage implements OnInit {
  protected readonly title = signal('VitalView');
  private readonly API_BASE = 'https://vitalview-backend.onrender.com';

  get token() {
    return this.authState.token;
  }

  private injector = inject(Injector);

  hasAnalysis = computed(() => !!this.analysisResult);


  // File analysis state
  selectedFile: File | null = null;
  analysisStatus = signal<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  analysisMessage = signal<string | null>(null);
  analysisResult: any | null = null;

  // Tabs for the 3 metrics
  readonly metricTabs: MetricTab[] = [
    { id: 'heartrate', label: 'Heart rate', color: 'rose' },
    { id: 'gindex', label: 'G-index', color: 'emerald' },
    { id: 'brainPulsatility', label: 'Brain pulsatility', color: 'indigo' },
  ];

  metrics = signal<Record<MetricId, any>>({
    heartrate: null,
    gindex: null,
    brainPulsatility: null,
  });

  selectedMetricId = signal<MetricId>('heartrate');

  loading = signal(true);
  error = signal<string | null>(null);

  private chart?: Chart;

  currentMetric = computed(() => this.metrics()[this.selectedMetricId()]);
  currentTab = computed(() => this.metricTabs.find((t) => t.id === this.selectedMetricId())!);

  constructor(
    private http: HttpClient,
    private analysis: AnalysisService,
    private authState: AuthStateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // if not logged in, go to login
    if (!this.token()) {
      this.router.navigateByUrl('/login');
      return;
    }

    // this.fetchMetric('heartrate', `${this.API_BASE}/metrics/heartrate`, true);
    // this.fetchMetric('gindex', `${this.API_BASE}/metrics/gindex`);
    // this.fetchMetric('brainPulsatility', `${this.API_BASE}/metrics/brain-pulsatility`);
  }

  logout() {
    this.authState.clear();
    this.router.navigateByUrl('/login');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;

    this.analysisResult = null;
    this.analysisStatus.set('idle');
    this.analysisMessage.set(file ? `Selected file: ${file.name}` : 'No file selected');
  }

  async analyzeSelectedFile() {
    const token = this.token();

    if (!token) {
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

    // try {
    //   const resp: any = await firstValueFrom(
    //     this.analysis.uploadAndAnalyze(this.selectedFile, token),
    //   );

    //   this.analysisResult = resp.result;
    //   this.analysisStatus.set('done');
    //   this.analysisMessage.set('Analysis completed. See JSON below.');

      try {
    const resp: any = await firstValueFrom(
      this.analysis.uploadAndAnalyze(this.selectedFile, token),
    );

    // resp.result is the processed JSON (version, created, heartrate, gIndex, brainPulsatility)
    const result = resp.result;

    //  show raw JSON preview if you want
    this.analysisResult = result;

    //  map result fields into your existing metric ids
    this.metrics.set({
      heartrate: result.heartrate ?? null,
      gindex: result.gIndex ?? null,                 // NOTE: gIndex -> gindex
      brainPulsatility: result.brainPulsatility ?? null,
    });

    //  update UI state
    this.loading.set(false);
    this.error.set(null);
    this.selectedMetricId.set('heartrate');          // default to HR
    // this.analysisStatus.set('done');
    // this.analysisMessage.set('Analysis completed. Dashboard updated.');

    // add the funciton that hasnt been implemetned yet

    //  build the chart AFTER render (important)
    runInInjectionContext(this.injector, () => {
      afterNextRender(() => {
        const hr = this.metrics().heartrate;
        if (hr) this.buildChart('heartrate', hr);
      });
    });



    } catch (err: any) {
      console.error('Analysis error', err);
      this.analysisStatus.set('error');
      this.analysisMessage.set(err?.error?.message || err?.message || 'Analysis failed.');
    }
  }

  // private fetchMetric(id: MetricId, url: string, buildInitialChart = false) {
  //   this.http.get<any>(url).subscribe({
  //     next: (data) => {
  //       this.metrics.update((curr) => ({ ...curr, [id]: data }));

  //       if (id === 'heartrate' && buildInitialChart) {
  //         this.loading.set(false);

  //         afterNextRender(() => {
  //           this.buildChart(id, data);
  //         });
  //       }
  //     },
  //     error: () => {
  //       this.error.set(`Failed to load ${id} data`);
  //       this.loading.set(false);
  //     },
  //   });
  // }

  onSelectMetric(id: MetricId) {
    this.selectedMetricId.set(id);
    const metric = this.metrics()[id];
    if (metric) {
      afterNextRender(() => {
        this.buildChart(id, metric);
      });
}

  }

  private buildChart(id: MetricId, metric: any) {
    const canvas = document.getElementById('metricChart') as HTMLCanvasElement | null;
    if (!canvas) return;

    const measurements: any[] = metric?.measurements ?? [];
    if (!measurements.length) return;

    const hasTime = 'time' in measurements[0];
    const labels = measurements.map((m, index) =>
      hasTime ? `${(m.time / 1000).toFixed(0)}s` : `${index}`,
    );

    const sample = measurements[0];
    const valueKey =
      Object.keys(sample).find(
        (k) => k !== 'time' && k !== 'hrv' && typeof sample[k] === 'number',
      ) ?? 'rate';

    const values = measurements.map((m) => m[valueKey]);

    let yLabel = 'Value';
    if (id === 'heartrate') yLabel = 'Heart rate (bpm)';
    if (id === 'brainPulsatility') yLabel = 'Brain pulsatility (%)';
    if (id === 'gindex') yLabel = 'G-index';

    if (this.chart) this.chart.destroy();

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
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: hasTime ? 'Time (s)' : 'Sample index' } },
          y: { title: { display: true, text: yLabel } },
        },
      },
    });
  }

  getTrendAverage(metric: any): number | null {
    if (!metric?.trends) return null;
    if (metric.trends.rate?.average != null) return metric.trends.rate.average;
    if (metric.trends.hrv?.average != null) return metric.trends.hrv.average;

    const firstKey = Object.keys(metric.trends)[0];
    if (firstKey && metric.trends[firstKey]?.average != null) return metric.trends[firstKey].average;
    return null;
  }

  getTrendEntries(metricId: MetricId, metric: any): { label: string; value: number; unit: string }[] {
    if (!metric?.trends) return [];
    const entries: { label: string; value: number; unit: string }[] = [];

    for (const key of Object.keys(metric.trends)) {
      const trend = metric.trends[key];
      if (!trend || typeof trend.average !== 'number') continue;

      const label =
        key === 'rate' ? 'Average rate' : key === 'hrv' ? 'Average HRV' : `Average ${key}`;

      let unit = '';
      if (metricId === 'heartrate') unit = key === 'rate' ? 'bpm' : metric.units?.hrv ?? 'ms';
      if (metricId === 'brainPulsatility') unit = '%';
      if (metricId === 'gindex') unit = 'index';

      entries.push({ label, value: trend.average, unit });
    }

    return entries;
  }
}

