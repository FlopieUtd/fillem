export interface VideoFile {
  id: string;
  name: string;
  displayName: string;
  objectUrl: string;
  subtitleUrl?: string;
  // Series poster from a thumb.{jpg,jpeg,png,webp} in the show's root folder
  posterUrl?: string;
  duration: number | null;
  size: number;
  show?: string;
  season?: string;
  episodeNum?: number;
}
