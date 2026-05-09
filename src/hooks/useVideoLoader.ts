import { useCallback } from "react";
import type { VideoFile } from "../types/media";
import { formatDisplayName } from "../utils/video";
import { saveHandle } from "../utils/dirHandle";

const VIDEO_EXTS = /\.(mp4|mkv|webm|mov|avi|m4v)$/i;

const parseEpisodeName = (filename: string): string => {
  const match = filename.match(/S\d+E(\d+)[_\s-]+(.+?)(\.\w+)?$/i);
  if (!match) return formatDisplayName(filename);
  const epNum = match[1].padStart(2, "0");
  const title = match[2].replace(/[_-]+/g, " ").trim();
  return `E${epNum} · ${title}`;
};

const scanDir = async (
  dirHandle: FileSystemDirectoryHandle,
  videos: VideoFile[],
  pathParts: string[] = []
): Promise<void> => {
  for await (const entry of dirHandle.values()) {
    if (entry.kind === "directory") {
      await scanDir(
        entry as FileSystemDirectoryHandle,
        videos,
        [...pathParts, entry.name]
      );
    } else if (entry.kind === "file" && VIDEO_EXTS.test(entry.name)) {
      const file = await (entry as FileSystemFileHandle).getFile();
      const objectUrl = URL.createObjectURL(file);

      const show = pathParts.length >= 2 ? pathParts[0] : undefined;
      const season = pathParts.length >= 2 ? pathParts[1] : undefined;
      const episodeMatch = entry.name.match(/E(\d+)/i);
      const episodeNum = episodeMatch ? parseInt(episodeMatch[1], 10) : undefined;
      const displayName = show ? parseEpisodeName(entry.name) : formatDisplayName(entry.name);

      videos.push({
        id: `${[...pathParts, entry.name].join("/")}`,
        name: entry.name,
        displayName,
        objectUrl,
        duration: null,
        size: file.size,
        show,
        season,
        episodeNum,
      });
    }
  }
};

export const loadVideosFromHandle = async (
  dirHandle: FileSystemDirectoryHandle
): Promise<VideoFile[]> => {
  const videos: VideoFile[] = [];
  await scanDir(dirHandle, videos);
  return videos.sort(
    (a, b) =>
      (a.show ?? "").localeCompare(b.show ?? "") ||
      (a.season ?? "").localeCompare(b.season ?? "") ||
      (a.episodeNum ?? 0) - (b.episodeNum ?? 0) ||
      a.displayName.localeCompare(b.displayName)
  );
};

export const useVideoLoader = () => {
  const loadFromDirectory = useCallback(async (): Promise<VideoFile[]> => {
    if (!("showDirectoryPicker" in window)) {
      throw new Error("Your browser doesn't support the File System Access API. Try Chrome or Edge.");
    }

    const dirHandle = await (
      window as Window & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }
    ).showDirectoryPicker();

    await saveHandle(dirHandle);
    return loadVideosFromHandle(dirHandle);
  }, []);

  const loadFromFiles = useCallback(async (files: FileList): Promise<VideoFile[]> => {
    const videos: VideoFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("video/") && !VIDEO_EXTS.test(file.name)) continue;

      const objectUrl = URL.createObjectURL(file);
      videos.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        displayName: formatDisplayName(file.name),
        objectUrl,
        duration: null,
        size: file.size,
      });
    }

    return videos.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, []);

  return { loadFromDirectory, loadFromFiles };
};
