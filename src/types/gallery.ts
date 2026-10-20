export interface GalleryParam {
  label: string;
  value: string;
}

export interface GalleryHistogram {
  r: number[];
  g: number[];
  b: number[];
}

export interface GalleryMeta {
  params: GalleryParam[];
  histogram: GalleryHistogram;
  fileSize: number;
  isLivePhoto: boolean;
  liveVideo: string | null;
  altitude: number | null;
}

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
  original: string;
  lat: number;
  lon: number;
  city: string;
  country: string;
  locationName: string;
  accent: 'cyan' | 'magenta' | 'emerald' | 'amber' | 'violet';
  meta: GalleryMeta;
}
