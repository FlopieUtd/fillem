import { useState } from "react";
import type { VideoFile } from "../types/media";
import type { ProgressEntry } from "../utils/progress";
import { VideoCard } from "./VideoCard/VideoCard";

interface Props {
  show: string;
  seasons: Record<string, VideoFile[]>;
  progressMap: Record<string, ProgressEntry>;
  onPlay: (video: VideoFile) => void;
  onClose: () => void;
}

const formatSeason = (s: string) => {
  const n = s.match(/(\d+)/);
  return n ? `Season ${parseInt(n[1], 10)}` : s;
};

export const ShowDetail = ({ show, seasons, progressMap, onPlay, onClose }: Props) => {
  const seasonKeys = Object.keys(seasons).sort((a, b) => {
    if (a === "__unsorted__") return 1;
    if (b === "__unsorted__") return -1;
    const na = parseInt(a.match(/(\d+)/)?.[1] ?? "0", 10);
    const nb = parseInt(b.match(/(\d+)/)?.[1] ?? "0", 10);
    return na - nb;
  });

  const [activeSeason, setActiveSeason] = useState(seasonKeys[0] ?? "");

  const episodes = seasons[activeSeason] ?? [];
  const totalEpisodes = Object.values(seasons).reduce((sum, eps) => sum + eps.length, 0);

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-h-[85vh] bg-[#141414] rounded-t-[12px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[48px] py-[24px] border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white text-[24px] font-bold">{show}</h2>
            <p className="text-[#555] text-[13px] mt-[2px]">
              {totalEpisodes} episode{totalEpisodes !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-[36px] h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Season tabs */}
        {seasonKeys.length > 1 && (
          <div className="flex gap-[8px] px-[48px] pt-[20px] shrink-0">
            {seasonKeys.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSeason(s)}
                className={`px-[16px] py-[6px] rounded-full text-[13px] font-medium transition-colors ${
                  activeSeason === s
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                }`}
              >
                {s === "__unsorted__" ? "Other" : formatSeason(s)}
              </button>
            ))}
          </div>
        )}

        {/* Episodes */}
        <div className="overflow-x-auto flex-1 px-[48px] py-[24px] scrollbar-none">
          <div className="flex gap-[12px]">
            {episodes.map((v) => {
              const p = progressMap[v.id];
              return (
                <div key={v.id} className="shrink-0 w-[200px]">
                  <VideoCard
                    video={v}
                    onClick={onPlay}
                    progressRatio={p ? p.currentTime / p.duration : undefined}
                    label={v.displayName.replace(/^E(\d+)/, (_, n) => String(parseInt(n, 10)))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
