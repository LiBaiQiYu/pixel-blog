export interface WeatherDay {
  date: string;
  weekday: string;
  text: string;
  code: number;
  tempMax: number;
  tempMin: number;
  precipProb: number;
}

export interface WeatherCurrent {
  temp: number;
  feelsLike: number;
  text: string;
  code: number;
  humidity: number;
  windDir: string;
  windScale: number;
}

export interface WeatherData {
  city: string;
  updatedAt: string;
  source: string;
  attribution: string;
  /** Observer coordinates (used for solar/lunar position of the background) */
  lat?: number;
  lon?: number;
  timezone?: string;
  current: WeatherCurrent;
  daily: WeatherDay[];
}

export type WeatherKind =
  | 'sun'
  | 'partly'
  | 'cloud'
  | 'rain'
  | 'thunder'
  | 'hail'
  | 'snow'
  | 'sleet'
  | 'fog'
  | 'haze'
  | 'sand'
  | 'wind';
