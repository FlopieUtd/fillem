import { useCallback } from "react";
import type { VideoFile } from "../types/media";
import { formatDisplayName } from "../utils/video";

export const useVideoLoader = () => {
  const loadFromDirectory = useCallback(async (): Promise<VideoFile[]> => {
    if (!("showDirectoryPicker" in window)) {
      throw new Error(
        "Your browser doesn't support the File System Access API. Try Chrome or Edge."
      );
    }

    const dirHandle = await (
      window as Window & {
        showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker();

    const videos: VideoFile[] = [];

    for await (const entry of dirHandle.values()) {
      if (entry.kind !== "file") continue;
      if (!entry.name.match(/\.(mp4|mkv|webm|mov|avi|m4v)$/i)) continue;

      const file = await (entry as FileSystemFileHandle).getFile();
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

  const loadFromFiles = useCallback(async (files: FileList): Promise<VideoFile[]> => {
    const videos: VideoFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (
        !file.type.startsWith("video/") &&
        !file.name.match(/\.(mp4|mkv|webm|mov|avi|m4v)$/i)
      )
        continue;

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
