import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLibrary } from "../../context/LibraryContext";
import { useVideoLoader } from "../../hooks/useVideoLoader";

export const Home = () => {
  const { dispatch } = useLibrary();
  const { loadFromDirectory, loadFromFiles } = useVideoLoader();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const supportsDirectoryPicker = "showDirectoryPicker" in window;

  const handleOpenFolder = async () => {
    setError(null);
    setLoading(true);
    try {
      const videos = await loadFromDirectory();
      if (videos.length === 0) {
        setError("No video files found in that folder.");
        return;
      }
      dispatch({ type: "SET_VIDEOS", videos });
      navigate("/library");
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setError(null);
    setLoading(true);
    try {
      const videos = await loadFromFiles(e.target.files);
      if (videos.length === 0) {
        setError("No video files found.");
        return;
      }
      dispatch({ type: "SET_VIDEOS", videos });
      navigate("/library");
    } catch {
      setError("Failed to load files.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center px-[24px]">
      <div className="text-center max-w-[480px]">
        <div className="mb-[32px]">
          <div className="inline-flex items-center justify-center w-[80px] h-[80px] rounded-full bg-[#e50914] mb-[24px]">
            <svg className="w-[40px] h-[40px] text-white ml-[4px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h1 className="text-[36px] font-bold text-white tracking-tight mb-[12px]">
            Fillem
          </h1>
          <p className="text-[16px] text-[#8c8c8c] leading-relaxed">
            Open a folder of video files and browse them like a streaming library.
          </p>
        </div>

        <div className="flex flex-col gap-[12px]">
          {supportsDirectoryPicker && (
            <button
              onClick={handleOpenFolder}
              disabled={loading}
              className="w-full py-[14px] px-[24px] rounded-[6px] bg-[#e50914] hover:bg-[#f40612] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[16px] font-semibold transition-colors"
            >
              {loading ? "Loading…" : "Open Folder"}
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full py-[14px] px-[24px] rounded-[6px] bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[16px] font-semibold transition-colors border border-[#444]"
          >
            {loading ? "Loading…" : supportsDirectoryPicker ? "Pick Individual Files" : "Open Video Files"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mkv"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {error && (
          <p className="mt-[16px] text-[14px] text-[#e50914]">{error}</p>
        )}

        {!supportsDirectoryPicker && (
          <p className="mt-[16px] text-[12px] text-[#555]">
            For folder support, use Chrome or Edge.
          </p>
        )}
      </div>
    </div>
  );
};
