import { createBrowserRouter } from "react-router";
import AlbumPage, { loader as albumPageLoader } from "./pages/album";
import Root from "./pages/root";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "albums/:id",
        element: <AlbumPage />,
        loader: albumPageLoader,
      },
      {
        path: "trash",
        element: <div></div>,
      },
      {
        path: "notes/:id",
        element: <div></div>,
      },
    ],
  },
]);

export default router;
