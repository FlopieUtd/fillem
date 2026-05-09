// Keyed by video.id — persists for the session so re-mounts don't re-generate
const thumbnailCache = new Map<string, string | null>();

export const getCachedThumbnail = (id: string): string | null | undefined =>
  thumbnailCache.get(id);

export const setCachedThumbnail = (id: string, url: string | null) =>
  thumbnailCache.set(id, url);

export const clearThumbnailCache = () => {
  thumbnailCache.forEach((url) => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  });
  thumbnailCache.clear();
};

export const generateThumbnail = (src: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = src;
    video.preload = "metadata";
    video.muted = true;

    const release = () => {
      video.src = "";
      video.load(); // releases the buffer
    };

    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    const onError = () => {
      cleanup();
      release();
      resolve(null);
    };

    const onSeeked = () => {
      cleanup();
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        release();
        return resolve(null);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      release(); // release before toBlob to free the buffer ASAP
      canvas.toBlob(
        (blob) => resolve(blob ? URL.createObjectURL(blob) : null),
        "image/jpeg",
        0.8
      );
    };

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(5, video.duration * 0.1);
    });
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);

    setTimeout(() => {
      cleanup();
      release();
      resolve(null);
    }, 8000);
  });
};

export const formatTime = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

export const formatDisplayName = (filename: string) =>
  filename
    .replace(/\.[^.]+$/, "")
    .replace(/[._\-]+/g, " ")
    .trim();
