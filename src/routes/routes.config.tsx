import { createBrowserRouter } from "react-router-dom";
import { App } from "../App";
import { Home } from "../pages/Home/Home";
import { Library } from "../pages/Library/Library";
import { Stats } from "../pages/Stats/Stats";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { index: true, element: <Home /> },
        { path: "library", element: <Library /> },
        { path: "stats", element: <Stats /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }
);
