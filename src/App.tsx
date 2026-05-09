import { useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LibraryProvider, useLibrary } from "./context/LibraryContext";
import { useServerVideos } from "./hooks/useServerVideos";

const AppContent = () => {
  const { dispatch } = useLibrary();
  const { fetchVideos } = useServerVideos();
  const navigate = useNavigate();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    fetchVideos()
      .then((videos) => {
        if (videos.length > 0) {
          dispatch({ type: "SET_VIDEOS", videos });
          navigate("/library");
        }
      })
      .catch(() => {});
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
