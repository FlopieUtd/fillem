import { useState } from "react";
import type { VideoFile } from "../types/media";
import type { ProgressEntry } from "../utils/progress";
import { clearProgressFor } from "../utils/progress";
import { VideoCard } from "./VideoCard/VideoCard";

interface Props {
  show: string;
  seasons: Record<string, VideoFile[]>;
  progressMap: Record<string, ProgressEntry>;
  onPlay: (video: VideoFile) => void;
  onClose: () => void;
  onProgressChange: () => void;
}

const formatSeason = (s: string) => {
  const n = s.match(/(\d+)/);
  return n ? `Season ${parseInt(n[1], 10)}` : s;
};

export const ShowDetail = ({ show, seasons, progressMap, onPlay, onClose, onProgressChange }: Props) => {
  const seasonKeys = Object.keys(seasons).sort((a, b) => {
    if (a === "__unsorted__") return 1;
    if (b === "__unsorted__") return -1;
    const na = parseInt(a.match(/(\d+)/)?.[1] ?? "0", 10);
    const nb = parseInt(b.match(/(\d+)/)?.[1] ?? "0", 10);
    return na - nb;
  });

  const [activeSeason, setActiveSeason] = useState(seasonKeys[0] ?? "");
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  const episodes = seasons[activeSeason] ?? [];
  const totalEpisodes = Object.values(seasons).reduce((sum, eps) => sum + eps.length, 0);
  const multiSeason = seasonKeys.length > 1;

  // Scope the restart to the active season when there's more than one; otherwise
  // the whole show. Only show the control when there's progress to actually clear.
  const restartTargets = multiSeason ? episodes : Object.values(seasons).flat();
  const hasProgress = restartTargets.some((v) => progressMap[v.id]?.currentTime);
  const restartLabel = multiSeason
    ? `Restart ${activeSeason === "__unsorted__" ? "section" : formatSeason(activeSeason)}`
    : "Restart series";

  const handleRestart = () => {
    if (!confirmingRestart) {
      setConfirmingRestart(true);
      return;
    }
    clearProgressFor(restartTargets.map((v) => v.id));
    setConfirmingRestart(false);
    onProgressChange();
  };

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
          <div className="flex items-center gap-[12px]">
            {hasProgress && (
              <button
                onClick={handleRestart}
                onMouseLeave={() => setConfirmingRestart(false)}
                className={`px-[16px] py-[8px] rounded-full text-[13px] font-medium transition-colors ${
                  confirmingRestart
                    ? "bg-[#e50914] text-white hover:bg-[#f6121d]"
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                {confirmingRestart ? "Clear progress?" : restartLabel}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-[36px] h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <svg className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Season tabs */}
        {seasonKeys.length > 1 && (
          <div className="flex gap-[8px] px-[48px] pt-[20px] shrink-0">
            {seasonKeys.map((s) => (
              <button
                key={s}
                onClick={() => { setActiveSeason(s); setConfirmingRestart(false); }}
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
