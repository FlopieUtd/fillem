import { useState, useRef, useEffect } from "react";
import type { VideoFile } from "../../types/media";
import type { ProgressEntry } from "../../utils/progress";
import { generateThumbnail, getCachedThumbnail, setCachedThumbnail } from "../../utils/video";
import { formatTime } from "../../utils/video";

interface Props {
  show: string;
  video: VideoFile;
  progress: ProgressEntry;
  onClick: () => void;
}

export const ShowResumeCard = ({ show, video, progress, onClick }: Props) => {
  const [hovered, setHovered] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(() => {
    if (video.posterUrl) return video.posterUrl;
    const cached = getCachedThumbnail(video.id);
    return cached !== undefined ? cached : null;
  });
  const cardRef = useRef<HTMLButtonElement>(null);
  const generating = useRef(false);

  useEffect(() => {
    if (video.posterUrl) return; // series poster wins — skip frame generation
    if (getCachedThumbnail(video.id) !== undefined) return;
    if (generating.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (generating.current) return;
        generating.current = true;
        observer.disconnect();
        generateThumbnail(video.objectUrl).then((url) => {
          setCachedThumbnail(video.id, url);
          setThumbnail(url);
        });
      },
      { rootMargin: "100px" }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [video.id, video.objectUrl, video.posterUrl]);

  const progressRatio = progress.duration ? progress.currentTime / progress.duration : 0;

  return (
    <button
      ref={cardRef}
      className="group relative w-full text-left focus:outline-none"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`relative w-full aspect-video rounded-[6px] overflow-hidden bg-[#1a1a2e] transition-transform duration-200 ${
          hovered ? "scale-[1.04] shadow-[0_8px_32px_rgba(0,0,0,0.8)]" : ""
        }`}
      >
        {thumbnail ? (
          <img src={thumbnail} alt={show} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-[48px] h-[48px] text-[#444]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
          <div className="h-full bg-[#e50914]" style={{ width: `${progressRatio * 100}%` }} />
        </div>

        {/* Hover play button */}
        {hovered && (
          <div className="absolute bottom-[10px] left-[8px] right-[8px] flex items-center gap-[8px]">
            <div className="w-[28px] h-[28px] rounded-full bg-white flex items-center justify-center shrink-0">
              <svg className="w-[14px] h-[14px] text-black ml-[2px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-[11px] text-white font-medium">Resume · {formatTime(progress.currentTime)}</span>
          </div>
        )}
      </div>

      {/* Text below card */}
      <p className={`mt-[8px] text-[14px] font-semibold leading-snug truncate transition-colors duration-150 ${hovered ? "text-white" : "text-[#ddd]"}`}>
        {show}
      </p>
      <p className="text-[12px] text-[#666] truncate mt-[2px]">
        {video.season ? `${video.season} · ${video.displayName}` : video.displayName}
      </p>
    </button>
  );
};
