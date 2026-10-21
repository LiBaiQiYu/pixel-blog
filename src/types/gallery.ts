export interface GalleryParam {
  label: string;
  value: string;
}

export interface GallerySection {
  id: string;
  title: string;
  params: GalleryParam[];
}

export interface GalleryHistogram {
  r: number[];
  g: number[];
  b: number[];
}

export interface GalleryMeta {
  params: GalleryParam[];
  sections?: GallerySection[];
  tags?: string[];
  histogram: GalleryHistogram;
  fileSize: number;
  isLivePhoto: boolean;
  liveVideo: string | null;
  altitude: number | null;
}

export interface GalleryPhoto {
  id: string;
  title: string;
  category: string;
  area?: string;
  place?: string;
  description: string;
  date: string;
  width: number;
  height: number;
  aspect: number;
  src: string;
  medium: string;
  placeholder: string;
  original: string;
  lat?: number;
  lon?: number;
  city?: string;
  country?: string;
  locationName?: string;
  accent: 'cyan' | 'magenta' | 'emerald' | 'amber' | 'violet';
  meta: GalleryMeta;
}

export type GalleryEntry = Omit<
  GalleryPhoto,
  'src' | 'medium' | 'placeholder' | 'original' | 'meta'
>;
