export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  contentType: string;
  downloadUrl: string;
}

export interface ReleaseItem {
  version: string;
  title: string | null;
  url: string;
  downloadUrl?: string | null;
  assets?: ReleaseAsset[];
}
