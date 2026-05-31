import { useState, useRef, useEffect } from "react";
import type { VideoFile } from "../types/media";
import { generateThumbnail, getCachedThumbnail, setCachedThumbnail } from "../utils/video";

interface Props {
  show: string;
  heroVideo: VideoFile;
  seasonCount: number;
  episodeCount: number;
  onClick: () => void;
}

export const ShowCard = ({ show, heroVideo, seasonCount, episodeCount, onClick }: Props) => {
  const [hovered, setHovered] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(() => {
    if (heroVideo.posterUrl) return heroVideo.posterUrl;
    const cached = getCachedThumbnail(heroVideo.id);
    return cached !== undefined ? cached : null;
  });
  const cardRef = useRef<HTMLButtonElement>(null);
  const generating = useRef(false);

  useEffect(() => {
    if (heroVideo.posterUrl) return; // series poster wins — skip frame generation
    if (getCachedThumbnail(heroVideo.id) !== undefined) return;
    if (generating.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (generating.current) return;
        generating.current = true;
        observer.disconnect();
        generateThumbnail(heroVideo.objectUrl).then((url) => {
          setCachedThumbnail(heroVideo.id, url);
          setThumbnail(url);
        });
      },
      { rootMargin: "100px" }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [heroVideo.id, heroVideo.objectUrl, heroVideo.posterUrl]);

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
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-200 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        />
        {hovered && (
          <div className="absolute bottom-[12px] left-[8px] right-[8px] flex items-center gap-[8px]">
            <div className="w-[32px] h-[32px] rounded-full bg-white flex items-center justify-center shrink-0">
              <svg className="w-[16px] h-[16px] text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
              </svg>
            </div>
            <span className="text-[12px] text-white font-medium">Episodes</span>
          </div>
        )}
      </div>
      <p
        className={`mt-[8px] text-[14px] font-medium leading-snug truncate transition-colors duration-150 ${
          hovered ? "text-white" : "text-[#b3b3b3]"
        }`}
      >
        {show}
      </p>
      <p className="text-[12px] text-[#555]">
        {seasonCount > 1 ? `${seasonCount} seasons · ` : ""}{episodeCount} episode{episodeCount !== 1 ? "s" : ""}
      </p>
    </button>
  );
};
