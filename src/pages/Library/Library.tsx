import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLibrary } from "../../context/LibraryContext";
import { useVideoLoader } from "../../hooks/useVideoLoader";
import { VideoCard } from "../../components/VideoCard/VideoCard";
import { ShowResumeCard } from "../../components/VideoCard/ShowResumeCard";
import { ShowCard } from "../../components/ShowCard";
import { ShowDetail } from "../../components/ShowDetail";
import { VideoPlayer } from "../../components/VideoPlayer/VideoPlayer";
import { getAllProgress, getProgress } from "../../utils/progress";
import { generateThumbnail, getCachedThumbnail, setCachedThumbnail, formatTime } from "../../utils/video";
import type { VideoFile } from "../../types/media";
import type { ProgressEntry } from "../../utils/progress";

export const Library = () => {
  const { videos, dispatch } = useLibrary();
  const { loadFromDirectory, loadFromFiles } = useVideoLoader();
  const navigate = useNavigate();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeShow, setActiveShow] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [progressMap, setProgressMap] = useState<Record<string, ProgressEntry>>(() => getAllProgress());
  const [heroThumbnail, setHeroThumbnail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primeEls = useRef<HTMLVideoElement[]>([]);

  useEffect(() => {
    if (videos.length === 0) navigate("/");
  }, [videos.length, navigate]);

  // Group videos by show → season → sorted episodes
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, VideoFile[]>> = {};
    for (const v of videos) {
      const show = v.show ?? "__unsorted__";
      const season = v.season ?? "__unsorted__";
      if (!map[show]) map[show] = {};
      if (!map[show][season]) map[show][season] = [];
      map[show][season].push(v);
    }
    for (const show of Object.values(map)) {
      for (const eps of Object.values(show)) {
        eps.sort((a, b) => (a.episodeNum ?? 0) - (b.episodeNum ?? 0) || a.name.localeCompare(b.name));
      }
    }
    return map;
  }, [videos]);

  // One entry per show: the most recently watched in-progress episode
  const continueWatchingByShow = useMemo(() => {
    const showMap: Record<string, { video: VideoFile; progress: ProgressEntry }> = {};
    for (const v of videos) {
      const show = v.show ?? v.displayName;
      const p = progressMap[v.id];
      if (!p || !p.duration) continue;
      const ratio = p.currentTime / p.duration;
      if (ratio <= 0.02 || ratio >= 0.9) continue;
      if (!showMap[show] || p.updatedAt > showMap[show].progress.updatedAt) {
        showMap[show] = { video: v, progress: p };
      }
    }
    return Object.entries(showMap)
      .sort(([, a], [, b]) => b.progress.updatedAt - a.progress.updatedAt)
      .map(([show, data]) => ({ show, ...data }));
  }, [videos, progressMap]);

  const showEntries = useMemo(
    () =>
      Object.entries(grouped)
        .filter(([show]) => show !== "__unsorted__")
        .map(([show, seasons]) => {
          const allEps = Object.values(seasons).flat();
          const resumeEntry = continueWatchingByShow.find((e) => e.show === show);
          const seasonCount = Object.keys(seasons).filter((s) => s !== "__unsorted__").length;
          return { show, seasons, heroVideo: resumeEntry?.video ?? allEps[0], episodeCount: allEps.length, seasonCount };
        }),
    [grouped, continueWatchingByShow]
  );

  const unsortedEpisodes = useMemo(
    () => Object.values(grouped["__unsorted__"] ?? {}).flat(),
    [grouped]
  );

  // Hero: most recently watched show's current episode, or first video
  const heroEntry = continueWatchingByShow[0] ?? null;
  const heroVideo = heroEntry?.video ?? videos[0] ?? null;
  const heroProgress = heroEntry?.progress ?? null;

  // Generate hero background thumbnail (just one)
  useEffect(() => {
    if (!heroVideo) return;
    if (heroVideo.posterUrl) { setHeroThumbnail(heroVideo.posterUrl); return; }
    const cached = getCachedThumbnail(heroVideo.id);
    if (cached !== undefined) { setHeroThumbnail(cached); return; }
    generateThumbnail(heroVideo.objectUrl).then((url) => {
      setCachedThumbnail(heroVideo.id, url);
      setHeroThumbnail(url);
    });
  }, [heroVideo?.id, heroVideo?.posterUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prime continue-watching videos at their resume positions so playback starts instantly.
  // Keyed only on video IDs — progress updates must not re-trigger this or they'll spam
  // cancelled range requests and eventually exhaust the connection pool.
  const continueWatchingRef = useRef(continueWatchingByShow);
  continueWatchingRef.current = continueWatchingByShow;
  const primeKey = continueWatchingByShow.slice(0, 4).map((e) => e.video.id).join("|");

  useEffect(() => {
    primeEls.current.forEach((el) => { el.src = ""; el.load(); });
    primeEls.current = [];

    continueWatchingRef.current.slice(0, 4).forEach(({ video, progress }) => {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.muted = true;
      const t0 = performance.now();
      console.log("[prime] start —", video.displayName, `@ ${Math.round(progress.currentTime)}s`);
      el.addEventListener("loadedmetadata", () => { el.currentTime = progress.currentTime; }, { once: true });
      el.addEventListener("seeked", () => {
        console.log(`[prime] ready — ${video.displayName} in ${Math.round(performance.now() - t0)}ms`);
      }, { once: true });
      el.src = video.objectUrl;
      primeEls.current.push(el);
    });

    return () => {
      primeEls.current.forEach((el) => { el.src = ""; el.load(); });
      primeEls.current = [];
    };
  }, [primeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardClick = (video: VideoFile) => setActiveId(video.id);

  const handlePlayerClose = () => {
    setActiveId(null);
    setProgressMap(getAllProgress());
  };

  const handleAddFolder = async () => {
    try {
      const vids = await loadFromDirectory();
      if (vids.length > 0) dispatch({ type: "ADD_VIDEOS", videos: vids });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") console.error(err.message);
    }
  };

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const vids = await loadFromFiles(e.target.files);
    if (vids.length > 0) dispatch({ type: "ADD_VIDEOS", videos: vids });
  };

  // Search result: flat filtered list
  const searchResults = search
    ? videos.filter((v) => v.displayName.toLowerCase().includes(search.toLowerCase()))
    : null;

  const activeVideo = activeId ? videos.find((v) => v.id === activeId) ?? null : null;

  // Prev/next are siloed to the active video's series — navigation never crosses
  // into another show. Episodes are ordered by season, then by episode within it.
  const seriesEpisodes = useMemo(() => {
    if (!activeVideo) return [];
    const seasons = grouped[activeVideo.show ?? "__unsorted__"];
    if (!seasons) return [activeVideo];
    const seasonKeys = Object.keys(seasons).sort((a, b) => {
      if (a === "__unsorted__") return 1;
      if (b === "__unsorted__") return -1;
      const na = parseInt(a.match(/(\d+)/)?.[1] ?? "0", 10);
      const nb = parseInt(b.match(/(\d+)/)?.[1] ?? "0", 10);
      return na - nb;
    });
    return seasonKeys.flatMap((s) => seasons[s]);
  }, [activeVideo, grouped]);

  const activeIndex = activeVideo ? seriesEpisodes.findIndex((v) => v.id === activeVideo.id) : -1;

  if (videos.length === 0) return null;

  return (
    <div className="min-h-screen bg-[#141414]">

      {/* Fixed transparent header */}
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center gap-[24px] px-[48px] py-[20px] bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => { dispatch({ type: "CLEAR" }); navigate("/"); }}
          className="flex items-center gap-[8px] shrink-0"
        >
          <svg className="w-[28px] h-[28px] text-[#e50914]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="text-[18px] font-bold text-white tracking-wide">Fillem</span>
        </button>

        <div className="flex-1 max-w-[360px]">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/20 rounded-[4px] px-[12px] py-[6px] text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 backdrop-blur"
          />
        </div>

        <div className="flex items-center gap-[8px] ml-auto">
          {"showDirectoryPicker" in window && (
            <button
              onClick={handleAddFolder}
              className="px-[12px] py-[6px] rounded-[4px] bg-white/10 hover:bg-white/20 text-[13px] text-white/80 transition-colors"
            >
              + Folder
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-[12px] py-[6px] rounded-[4px] bg-white/10 hover:bg-white/20 text-[13px] text-white/80 transition-colors"
          >
            + Files
          </button>
          <input ref={fileInputRef} type="file" accept="video/*,.mkv" multiple className="hidden" onChange={handleAddFiles} />
        </div>
      </header>

      {/* Search results view */}
      {searchResults ? (
        <div className="pt-[100px] px-[48px] pb-[48px]">
          <p className="text-[#888] text-[14px] mb-[24px]">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
          {searchResults.length === 0 ? (
            <p className="text-[#555] text-[16px]">Nothing found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-[16px] gap-y-[32px]">
              {searchResults.map((v) => {
                const p = getProgress(v.id);
                return (
                  <VideoCard
                    key={v.id}
                    video={v}
                    onClick={handleCardClick}
                    progressRatio={p ? p.currentTime / p.duration : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Hero */}
          {heroVideo && (
            <div className="relative w-full h-[75vh] min-h-[480px] flex items-end overflow-hidden">
              {/* Background thumbnail */}
              {heroThumbnail ? (
                <img
                  src={heroThumbnail}
                  className="absolute inset-0 w-full h-full object-cover scale-[1.05]"
                  style={{ filter: "blur(2px)" }}
                  alt=""
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a]" />
              )}

              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 via-transparent to-transparent" />

              {/* Content */}
              <div className="relative z-10 px-[48px] pb-[48px] max-w-[600px]">
                <h1 className="text-[48px] font-bold text-white leading-tight mb-[8px] drop-shadow-lg">
                  {heroVideo.show ?? heroVideo.displayName}
                </h1>
                {heroVideo.season && (
                  <p className="text-[16px] text-white/70 mb-[6px]">
                    {heroVideo.season.replace(/^.*?(\d+).*$/, "Season $1")}
                    {heroVideo.episodeNum !== undefined && ` · Episode ${heroVideo.episodeNum}`}
                  </p>
                )}
                <p className="text-[18px] text-white/90 font-medium mb-[24px]">
                  {heroVideo.displayName}
                </p>

                {heroProgress && (
                  <div className="mb-[20px]">
                    <div className="flex items-center gap-[8px] mb-[8px]">
                      <span className="text-[13px] text-white/50">
                        {formatTime(heroProgress.currentTime)} of {formatTime(heroProgress.duration)}
                      </span>
                    </div>
                    <div className="w-[200px] h-[3px] bg-white/20 rounded-full">
                      <div
                        className="h-full bg-[#e50914] rounded-full"
                        style={{ width: `${(heroProgress.currentTime / heroProgress.duration) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-[12px]">
                  <button
                    onClick={() => handleCardClick(heroVideo)}
                    className="flex items-center gap-[10px] px-[28px] py-[12px] rounded-[4px] bg-white hover:bg-white/90 text-black text-[16px] font-bold transition-colors"
                  >
                    <svg className="w-[20px] h-[20px] ml-[-2px]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {heroProgress ? "Resume" : "Play"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content rows */}
          <div className="pb-[48px] space-y-[40px]">

            {/* Continue Watching row — one card per show */}
            {continueWatchingByShow.length > 0 && (
              <ContentRow title="Continue Watching">
                {continueWatchingByShow.map(({ show, video, progress }) => (
                  <CardSlot key={show}>
                    <ShowResumeCard
                      show={show}
                      video={video}
                      progress={progress}
                      onClick={() => handleCardClick(video)}
                    />
                  </CardSlot>
                ))}
              </ContentRow>
            )}

            {/* Shows row — one card per series */}
            {showEntries.length > 0 && (
              <ContentRow title="Shows">
                {showEntries.map(({ show, heroVideo, seasonCount, episodeCount }) => (
                  <CardSlot key={show}>
                    <ShowCard
                      show={show}
                      heroVideo={heroVideo}
                      seasonCount={seasonCount}
                      episodeCount={episodeCount}
                      onClick={() => setActiveShow(show)}
                    />
                  </CardSlot>
                ))}
              </ContentRow>
            )}

            {/* Unsorted / individual videos */}
            {unsortedEpisodes.length > 0 && (
              <ContentRow
                title="Videos"
                subtitle={`${unsortedEpisodes.length} video${unsortedEpisodes.length !== 1 ? "s" : ""}`}
              >
                {unsortedEpisodes.map((v) => {
                  const p = progressMap[v.id];
                  return (
                    <CardSlot key={v.id}>
                      <VideoCard
                        video={v}
                        onClick={handleCardClick}
                        progressRatio={p ? p.currentTime / p.duration : undefined}
                      />
                    </CardSlot>
                  );
                })}
              </ContentRow>
            )}
          </div>
        </>
      )}

      {activeShow && (
        <ShowDetail
          show={activeShow}
          seasons={grouped[activeShow] ?? {}}
          progressMap={progressMap}
          onPlay={(v) => { setActiveShow(null); handleCardClick(v); }}
          onClose={() => setActiveShow(null)}
        />
      )}

      {activeVideo && (
        <VideoPlayer
          video={activeVideo}
          onClose={handlePlayerClose}
          onPrev={activeIndex > 0 ? () => setActiveId(seriesEpisodes[activeIndex - 1].id) : null}
          onNext={activeIndex < seriesEpisodes.length - 1 ? () => setActiveId(seriesEpisodes[activeIndex + 1].id) : null}
        />
      )}
    </div>
  );
};

// ─── Small layout helpers ────────────────────────────────────────────────────

interface ContentRowProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const ContentRow = ({ title, subtitle, children }: ContentRowProps) => (
  <section className="px-[48px]">
    <div className="flex items-baseline gap-[12px] mb-[16px]">
      <h2 className="text-white text-[20px] font-semibold">{title}</h2>
      {subtitle && <span className="text-[#666] text-[13px]">{subtitle}</span>}
    </div>
    <div className="flex gap-[12px] overflow-x-auto pb-[8px] scrollbar-none">
      {children}
    </div>
  </section>
);

const CardSlot = ({ children }: { children: React.ReactNode }) => (
  <div className="shrink-0 w-[200px]">{children}</div>
);
