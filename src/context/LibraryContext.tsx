import { createContext, useContext, useReducer, useEffect } from "react";
import type { ReactNode } from "react";
import type { VideoFile } from "../types/media";
import { clearThumbnailCache } from "../utils/video";

interface LibraryState {
  videos: VideoFile[];
}

type LibraryAction =
  | { type: "SET_VIDEOS"; videos: VideoFile[] }
  | { type: "ADD_VIDEOS"; videos: VideoFile[] }
  | { type: "CLEAR" };

const initialState: LibraryState = { videos: [] };

const reducer = (state: LibraryState, action: LibraryAction): LibraryState => {
  switch (action.type) {
    case "SET_VIDEOS":
      return { videos: action.videos };
    case "ADD_VIDEOS": {
      const existingIds = new Set(state.videos.map((v) => v.id));
      const newVideos = action.videos.filter((v) => !existingIds.has(v.id));
      return { videos: [...state.videos, ...newVideos] };
    }
    case "CLEAR":
      return initialState;
    default:
      return state;
  }
};

interface LibraryContextValue extends LibraryState {
  dispatch: React.Dispatch<LibraryAction>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export const LibraryProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    return () => {
      clearThumbnailCache();
      state.videos.forEach((v) => {
        if (v.objectUrl.startsWith("blob:")) URL.revokeObjectURL(v.objectUrl);
      });
    };
  }, [state.videos]);

  return <LibraryContext.Provider value={{ ...state, dispatch }}>{children}</LibraryContext.Provider>;
};

export const useLibrary = () => {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
};
