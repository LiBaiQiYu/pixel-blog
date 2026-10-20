export interface GalleryPhoto {
  id: string;
  title: string;
  area: string;
  place: string;
  description: string;
  date: string;
  width: number;
  height: number;
  aspect: number;
  src: string;
  view: string;
  lat: number;
  lon: number;
  city: string;
  country: string;
  locationName: string;
  accent: 'cyan' | 'magenta' | 'emerald' | 'amber' | 'violet';
}
