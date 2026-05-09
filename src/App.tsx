import { useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LibraryProvider, useLibrary } from "./context/LibraryContext";
import { useServerVideos } from "./hooks/useServerVideos";
import { loadHandle } from "./utils/dirHandle";
import { loadVideosFromHandle } from "./hooks/useVideoLoader";

const AppContent = () => {
  const { dispatch } = useLibrary();
  const { fetchVideos } = useServerVideos();
  const navigate = useNavigate();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const tryLoad = async () => {
      // 1. Try local Vite dev server
      try {
        const videos = await fetchVideos();
        if (videos.length > 0) {
          dispatch({ type: "SET_VIDEOS", videos });
          navigate("/library");
          return;
        }
      } catch { /* server not running */ }

      // 2. Try persisted directory handle (GitHub Pages / File System Access API)
      try {
        const handle = await loadHandle();
        if (!handle) return;

        const permission = await (handle as FileSystemDirectoryHandle & {
          requestPermission: (opts: { mode: string }) => Promise<string>;
        }).requestPermission({ mode: "read" });
        if (permission !== "granted") return;

        const videos = await loadVideosFromHandle(handle);
        if (videos.length > 0) {
          dispatch({ type: "SET_VIDEOS", videos });
          navigate("/library");
        }
      } catch { /* handle gone or permission denied */ }
    };

    tryLoad();
  }, [dispatch, fetchVideos, navigate]);

  return <Outlet />;
};

export const App = () => {
  return (
    <LibraryProvider>
      <AppContent />
    </LibraryProvider>
  );
};
