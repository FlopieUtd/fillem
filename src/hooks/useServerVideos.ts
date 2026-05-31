import { useCallback } from "react";
import type { VideoFile } from "../types/media";
import { formatDisplayName } from "../utils/video";

const parseEpisodeName = (filename: string): string => {
  // "Bluey_S01E03_Keepy Uppy.mp4" → "E03 · Keepy Uppy"
  const match = filename.match(/S\d+E(\d+)[_\s-]+(.+?)(\.\w+)?$/i);
  if (!match) return formatDisplayName(filename);
  const epNum = match[1].padStart(2, "0");
  const title = match[2].replace(/[_-]+/g, " ").trim();
  return `E${epNum} · ${title}`;
};

export const useServerVideos = () => {
  const fetchVideos = useCallback(async (): Promise<VideoFile[]> => {
    const res = await fetch("/api/videos");
    if (!res.ok) throw new Error("Server unavailable");
    const list: Array<{ name: string; relativePath: string; size: number; thumb?: string }> =
      await res.json();

    return list.map(({ name, relativePath, size, thumb }) => {
      const urlPath = relativePath.split("/").map(encodeURIComponent).join("/");
      const parts = relativePath.split("/");

      // parts: [show, season, filename] for nested, or [filename] for flat
      const show = parts.length >= 3 ? parts[0] : undefined;
      const season = parts.length >= 3 ? parts[1] : undefined;

      const episodeMatch = name.match(/E(\d+)/i);
      const episodeNum = episodeMatch ? parseInt(episodeMatch[1], 10) : undefined;

      const displayName = show ? parseEpisodeName(name) : formatDisplayName(name);

      return {
        id: `server:${relativePath}`,
        name,
        displayName,
        objectUrl: `/videos/${urlPath}`,
        posterUrl: thumb
          ? `/videos/${thumb.split("/").map(encodeURIComponent).join("/")}`
          : undefined,
        duration: null,
        size,
        show,
        season,
        episodeNum,
      };
    });
  }, []);

  return { fetchVideos };
};
