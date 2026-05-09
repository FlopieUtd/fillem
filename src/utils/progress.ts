const KEY = "media-progress";

export interface ProgressEntry {
  currentTime: number;
  duration: number;
  updatedAt: number;
}

type ProgressMap = Record<string, ProgressEntry>;

const load = (): ProgressMap => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
};

export const getProgress = (videoId: string): ProgressEntry | null =>
  load()[videoId] ?? null;

export const getAllProgress = (): ProgressMap => load();

export const saveProgress = (videoId: string, currentTime: number, duration: number) => {
  if (!duration || currentTime < 5) return;
  const map = load();
  map[videoId] = { currentTime, duration, updatedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(map));
};

export const clearProgress = (videoId: string) => {
  const map = load();
  delete map[videoId];
  localStorage.setItem(KEY, JSON.stringify(map));
};
