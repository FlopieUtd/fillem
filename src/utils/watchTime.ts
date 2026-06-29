const KEY = "watch-time";

// Map of local calendar date ("YYYY-MM-DD") → seconds watched that day.
type WatchMap = Record<string, number>;

// Local-time date key. Using local components (not toISOString) keeps a session
// in the same bucket as the wall clock the user is actually watching by.
export const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const load = (): WatchMap => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
};

export const getWatchTime = (): WatchMap => load();

// Add watched seconds to today's bucket. Drops non-positive deltas (paused,
// seeked back, episode change) and absurd outliers; the caller already clamps
// to elapsed wall-clock time, so anything reaching here is real viewing.
export const addWatchSeconds = (seconds: number) => {
  if (!(seconds > 0) || seconds > 3600) return;
  const map = load();
  const key = dateKey(new Date());
  map[key] = (map[key] ?? 0) + seconds;
  localStorage.setItem(KEY, JSON.stringify(map));
};
