export interface HeartrateMeasurement {
  rate: number;
  time: number; // in ms
  hrv: number;
}

export interface HeartrateTrends {
  hrv: { average: number };
  rate: { average: number };
}

export interface HeartrateMetric {
  description: string;
  errors: any[];
  units: {
    [key: string]: string | null;
  };
  measurements: HeartrateMeasurement[];
  trends: HeartrateTrends;
}
