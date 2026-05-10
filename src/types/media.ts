export interface VideoFile {
  id: string;
  name: string;
  displayName: string;
  objectUrl: string;
  subtitleUrl?: string;
  duration: number | null;
  size: number;
  show?: string;
  season?: string;
  episodeNum?: number;
}
