import { useState, useRef, useEffect, useCallback } from "react";
import type { VideoFile } from "../../types/media";
import { getProgress, saveProgress, clearProgress } from "../../utils/progress";

interface Props {
  video: VideoFile;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const IconPlay = () => (
  <svg className="w-[30px] h-[30px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const IconPause = () => (
  <svg className="w-[30px] h-[30px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);
const IconReplay10 = () => (
  <svg className="w-[32px] h-[32px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
    <text x="12" y="16" textAnchor="middle" fontSize="5.5" fontFamily="sans-serif" fill="currentColor">10</text>
  </svg>
);
const IconForward10 = () => (
  <svg className="w-[32px] h-[32px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
    <text x="12" y="16" textAnchor="middle" fontSize="5.5" fontFamily="sans-serif" fill="currentColor">10</text>
  </svg>
);
const IconVolumeMute = () => (
  <svg className="w-[28px] h-[28px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);
const IconVolumeLow = () => (
  <svg className="w-[28px] h-[28px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
  </svg>
);
const IconVolumeHigh = () => (
  <svg className="w-[28px] h-[28px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);
const IconSkipPrev = () => (
  <svg className="w-[30px] h-[30px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
  </svg>
);
const IconSkipNext = () => (
  <svg className="w-[30px] h-[30px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);
const IconFullscreenEnter = () => (
  <svg className="w-[28px] h-[28px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);
const IconFullscreenExit = () => (
  <svg className="w-[28px] h-[28px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
  </svg>
);

const Tooltip = ({ label, below = false, children }: { label: string; below?: boolean; children: React.ReactNode }) => (
  <div className="relative group/tip">
    {children}
    <span
      className={`absolute ${below ? "top-full mt-[8px]" : "bottom-full mb-[8px]"} left-1/2 -translate-x-1/2 px-[8px] py-[3px] rounded-[4px] bg-black/90 text-white text-[12px] whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-10`}
    >
      {label}
    </span>
  </div>
);

export const VideoPlayer = ({ video, onClose, onPrev, onNext }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Always holds the latest { id, time, duration } — never stale in closures
  const progressRef = useRef({ id: video.id, time: 0, duration: 0 });
  const loadStartRef = useRef(performance.now());

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ type: "play" | "pause"; key: number } | null>(null);
  const flashCounter = useRef(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Enter fullscreen on mount
  useEffect(() => {
    containerRef.current?.requestFullscreen().catch(() => {});
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Sync fullscreen state; exit player when user escapes fullscreen
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        // Save synchronously before the parent re-renders and reads localStorage
        const p = progressRef.current;
        if (p.duration > 0 && !(videoRef.current?.ended)) saveProgress(p.id, p.time, p.duration);
        onClose();
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [onClose]);

  // On video change: save previous video's progress, then set up new video
  useEffect(() => {
    const prev = progressRef.current;
    if (prev.id !== video.id && prev.duration > 0) {
      saveProgress(prev.id, prev.time, prev.duration);
    }
    progressRef.current = { id: video.id, time: 0, duration: 0 };
    loadStartRef.current = performance.now();

    const el = videoRef.current;
    if (!el) return;
    const saved = getProgress(video.id);
    const resume = saved && saved.duration > 0 && saved.currentTime / saved.duration < 0.9;
    const onReady = () => {
      // Re-apply audio state right before play — browser may reset it during src change
      el.muted = muted;
      el.volume = volume;
      if (resume) el.currentTime = saved.currentTime;
      el.play().catch(() => {});
    };
    if (el.readyState >= 1) {
      onReady();
    } else {
      el.addEventListener("loadedmetadata", onReady, { once: true });
    }
    setCurrentTime(resume ? saved.currentTime : 0);
    setLoading(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  // Keep muted in sync when user toggles it mid-playback
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Save progress every 5s while playing (progressRef always current, no deps needed)
  useEffect(() => {
    const id = setInterval(() => {
      const p = progressRef.current;
      if (videoRef.current && !videoRef.current.paused && p.duration > 0) {
        saveProgress(p.id, p.time, p.duration);
      }
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 1000);
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT") return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime -= 10;
          break;
        case "ArrowRight":
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime += 10;
          break;
        case "m":
        case "M":
          if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
          break;
        case "f":
        case "F":
          document.fullscreenElement
            ? document.exitFullscreen()
            : containerRef.current?.requestFullscreen();
          break;
      }
      revealControls();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [revealControls]);

  const togglePlay = () =>
    videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause();

  const toggleFullscreen = () =>
    document.fullscreenElement
      ? document.exitFullscreen()
      : containerRef.current?.requestFullscreen();

  const handleClose = () => {
    const p = progressRef.current;
    if (p.duration > 0 && !(videoRef.current?.ended)) saveProgress(p.id, p.time, p.duration);
    document.exitFullscreen().catch(() => {});
  };

  const seek = (delta: number) => {
    if (videoRef.current) videoRef.current.currentTime += delta;
  };

  const handleScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current) videoRef.current.currentTime = ratio * duration;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
  };

  const VolumeIcon = muted || volume === 0 ? IconVolumeMute : volume < 0.5 ? IconVolumeLow : IconVolumeHigh;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={revealControls}
      style={{ cursor: controlsVisible ? "default" : "none" }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={video.objectUrl}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlay={() => {
          console.log(`[player] started in ${Math.round(performance.now() - loadStartRef.current)}ms —`, video.displayName);
          setPlaying(true);
          setFlash({ type: "play", key: ++flashCounter.current });
          scheduleHide();
        }}
        onPause={() => {
          setPlaying(false);
          setFlash({ type: "pause", key: ++flashCounter.current });
          clearTimeout(hideTimerRef.current);
          setControlsVisible(true);
        }}
        onTimeUpdate={() => {
          const el = videoRef.current;
          if (!el) return;
          setCurrentTime(el.currentTime);
          progressRef.current.time = el.currentTime;
          progressRef.current.duration = el.duration;
        }}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onEnded={() => {
          clearProgress(video.id);
          onNext?.();
        }}
        onVolumeChange={() => {
          setVolume(videoRef.current?.volume ?? 1);
          setMuted(videoRef.current?.muted ?? false);
        }}
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-[56px] h-[56px] animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Play/pause flash */}
      {flash && (
        <div
          key={flash.key}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ animation: "player-flash 550ms ease-out forwards" }}
          onAnimationEnd={() => setFlash(null)}
        >
          <div className="w-[96px] h-[96px] rounded-full bg-black/40 flex items-center justify-center">
            {flash.type === "play" ? (
              <svg className="w-[48px] h-[48px] text-white ml-[4px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="w-[44px] h-[44px] text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Top banner */}
      <div
        className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent px-[48px] pt-[32px] pb-[64px] transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white text-[22px] font-semibold drop-shadow-lg">{video.displayName}</h2>
          <Tooltip label="Close" below>
            <button
              onClick={handleClose}
              className="w-[32px] h-[32px] rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <svg className="w-[20px] h-[20px] text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-[48px] pt-[96px] pb-[36px] transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber */}
        <div className="mb-[24px] group/scrub">
          <div
            className="relative h-[5px] bg-white/30 cursor-pointer transition-all duration-100 group-hover/scrub:h-[7px]"
            onClick={handleScrubClick}
          >
            <div className="relative h-full bg-[#e50914]" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[16px] h-[16px] bg-white rounded-full opacity-0 group-hover/scrub:opacity-100 transition-opacity shadow-md" />
            </div>
          </div>
        </div>

        {/* Button row */}
        <div className="flex items-center gap-[24px]">
          <Tooltip label={playing ? "Pause" : "Play"}>
            <button onClick={togglePlay} className="text-white hover:text-white/80 transition-colors" aria-label={playing ? "Pause" : "Play"}>
              {playing ? <IconPause /> : <IconPlay />}
            </button>
          </Tooltip>

          <Tooltip label="Back 10s">
            <button onClick={() => seek(-10)} className="text-white hover:text-white/80 transition-colors" aria-label="Back 10s">
              <IconReplay10 />
            </button>
          </Tooltip>

          <Tooltip label="Forward 10s">
            <button onClick={() => seek(10)} className="text-white hover:text-white/80 transition-colors" aria-label="Forward 10s">
              <IconForward10 />
            </button>
          </Tooltip>

          {onPrev && (
            <Tooltip label="Previous">
              <button onClick={onPrev} className="text-white hover:text-white/80 transition-colors" aria-label="Previous">
                <IconSkipPrev />
              </button>
            </Tooltip>
          )}
          {onNext && (
            <Tooltip label="Next episode">
              <button onClick={onNext} className="text-white hover:text-white/80 transition-colors" aria-label="Next">
                <IconSkipNext />
              </button>
            </Tooltip>
          )}

          <span className="text-white/80 text-[16px] tabular-nums">
            {formatTime(currentTime)}
            <span className="text-white/40 mx-[4px]">/</span>
            {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <div className="flex items-center gap-[8px] group/vol">
            <Tooltip label={muted || volume === 0 ? "Unmute" : "Mute"}>
              <button
                onClick={() => { if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }}
                className="text-white hover:text-white/80 transition-colors"
              >
                <VolumeIcon />
              </button>
            </Tooltip>
            <div className="w-0 overflow-hidden group-hover/vol:w-[80px] transition-all duration-200">
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-[80px] accent-white cursor-pointer"
              />
            </div>
          </div>

          <Tooltip label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            <button onClick={toggleFullscreen} className="text-white hover:text-white/80 transition-colors">
              {isFullscreen ? <IconFullscreenExit /> : <IconFullscreenEnter />}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
