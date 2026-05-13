import { useState, useRef, useEffect } from "react";
import type { VideoFile } from "../../types/media";
import { generateThumbnail, getCachedThumbnail, setCachedThumbnail } from "../../utils/video";

interface Props {
  video: VideoFile;
  onClick: (video: VideoFile) => void;
  progressRatio?: number;
  label?: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
};

export const VideoCard = ({ video, onClick, progressRatio, label }: Props) => {
  const [hovered, setHovered] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(() => {
    const cached = getCachedThumbnail(video.id);
    return cached !== undefined ? cached : null;
  });
  const cardRef = useRef<HTMLButtonElement>(null);
  const generating = useRef(false);

  useEffect(() => {
    // Already cached (even a null result means we already tried)
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
  }, [video.id, video.objectUrl]);

  return (
    <button
      ref={cardRef}
      className="group relative w-full text-left focus:outline-none"
      onClick={() => onClick(video)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`relative w-full aspect-video rounded-[6px] overflow-hidden bg-[#1a1a2e] transition-transform duration-200 ${
          hovered ? "scale-[1.04] shadow-[0_8px_32px_rgba(0,0,0,0.8)]" : ""
        }`}
      >
        {thumbnail ? (
          <img src={thumbnail} alt={video.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-[48px] h-[48px] text-[#444]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-200 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        />
        {progressRatio !== undefined && progressRatio > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
            <div className="h-full bg-[#e50914]" style={{ width: `${progressRatio * 100}%` }} />
          </div>
        )}
        {hovered && (
          <div className="absolute bottom-[12px] left-[8px] right-[8px] flex items-center gap-[8px]">
            <div className="w-[32px] h-[32px] rounded-full bg-white flex items-center justify-center shrink-0">
              <svg className="w-[16px] h-[16px] text-black ml-[2px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-[12px] text-white font-medium">
              {progressRatio !== undefined && progressRatio > 0 && progressRatio < 0.95 ? "Resume" : "Play"}
            </span>
            <span className="text-[12px] text-[#aaa] ml-auto">{formatSize(video.size)}</span>
          </div>
        )}
      </div>
      <p
        className={`mt-[8px] text-[14px] font-medium leading-snug truncate transition-colors duration-150 ${
          hovered ? "text-white" : "text-[#b3b3b3]"
        }`}
      >
        {label ?? video.displayName}
      </p>
    </button>
  );
};
