import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWatchTime, dateKey } from "../../utils/watchTime";

type View = "week" | "month";

interface Day {
  date: Date;
  seconds: number;
}

const DAY_MS = 86400000;

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return s > 0 ? "<1m" : "0m";
};

// Monday-start week containing the given date.
const startOfWeek = (d: Date) => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (date.getDay() + 6) % 7;
  return new Date(date.getTime() - day * DAY_MS);
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const Stats = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("week");
  // Anchor date — any day inside the period currently shown.
  const [anchor, setAnchor] = useState(() => new Date());

  const watch = useMemo(() => getWatchTime(), []);

  const days = useMemo<Day[]>(() => {
    if (view === "week") {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(start.getTime() + i * DAY_MS);
        return { date, seconds: watch[dateKey(date)] ?? 0 };
      });
    }
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return { date, seconds: watch[dateKey(date)] ?? 0 };
    });
  }, [view, anchor, watch]);

  const max = Math.max(1, ...days.map((d) => d.seconds));
  const total = days.reduce((sum, d) => sum + d.seconds, 0);
  const watchedDays = days.filter((d) => d.seconds > 0).length;
  const todayKey = dateKey(new Date());

  const label =
    view === "week"
      ? `${days[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6].date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const shift = (dir: -1 | 1) => {
    setAnchor((prev) => {
      if (view === "week") return new Date(prev.getTime() + dir * 7 * DAY_MS);
      return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
    });
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <header className="flex items-center gap-[24px] px-[48px] py-[20px]">
        <button
          onClick={() => navigate("/library")}
          className="flex items-center gap-[8px] text-white/70 hover:text-white transition-colors"
        >
          <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-[14px] font-medium">Back</span>
        </button>
        <h1 className="text-[24px] font-bold">Watch time</h1>
      </header>

      <div className="px-[48px] pb-[48px] max-w-[920px]">
        {/* View toggle */}
        <div className="inline-flex rounded-[6px] bg-white/10 p-[4px] mb-[32px]">
          {(["week", "month"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setAnchor(new Date()); }}
              className={`px-[20px] h-[34px] rounded-[4px] text-[14px] font-medium capitalize transition-colors ${
                view === v ? "bg-[#e50914] text-white" : "text-white/70 hover:text-white"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Period header + nav */}
        <div className="flex items-center justify-between mb-[8px]">
          <button
            onClick={() => shift(-1)}
            className="w-[36px] h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Previous"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-[18px] font-semibold">{label}</span>
          <button
            onClick={() => shift(1)}
            className="w-[36px] h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Next"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <div className="flex gap-[32px] mb-[28px] text-[#888] text-[13px]">
          <span>Total <span className="text-white font-semibold">{formatDuration(total)}</span></span>
          <span>Active days <span className="text-white font-semibold">{watchedDays}</span></span>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-[6px] h-[240px] border-b border-white/10 pb-[2px]">
          {days.map((d) => {
            const key = dateKey(d.date);
            const isToday = key === todayKey;
            const heightPct = (d.seconds / max) * 100;
            return (
              <div key={key} className="group relative flex-1 h-full flex flex-col justify-end items-center">
                {/* Tooltip */}
                <span className="absolute -top-[2px] left-1/2 -translate-x-1/2 -translate-y-full px-[8px] py-[4px] rounded-[4px] bg-black/90 text-[12px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {d.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}: {formatDuration(d.seconds)}
                </span>
                <div
                  className={`w-full max-w-[44px] rounded-t-[4px] transition-colors ${
                    d.seconds > 0
                      ? isToday ? "bg-[#e50914]" : "bg-[#e50914]/55 group-hover:bg-[#e50914]/80"
                      : "bg-white/5 group-hover:bg-white/10"
                  }`}
                  style={{ height: `${Math.max(heightPct, d.seconds > 0 ? 2 : 0)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex gap-[6px] mt-[8px]">
          {days.map((d) => {
            const key = dateKey(d.date);
            const text = view === "week" ? WEEKDAYS[(d.date.getDay() + 6) % 7] : String(d.date.getDate());
            // Month view gets crowded — show every label only when the month is short enough.
            const show = view === "week" || days.length <= 16 || d.date.getDate() % 2 === 1;
            return (
              <div key={key} className="flex-1 text-center text-[11px] text-[#777] tabular-nums">
                {show ? text : ""}
              </div>
            );
          })}
        </div>

        {total === 0 && (
          <p className="text-[#555] text-[14px] mt-[32px]">No watch time recorded for this {view}.</p>
        )}
      </div>
    </div>
  );
};
