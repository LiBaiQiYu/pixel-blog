export function getWeatherConfig(): unknown;
export function fetchWeatherForLocation(
  config: unknown,
  lat: number,
  lon: number
): Promise<unknown>;
