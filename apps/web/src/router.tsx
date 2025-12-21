import { createBrowserRouter } from "react-router";
import Root from "./pages/root";
import AlbumPage, { loader as albumPageLoader } from "./pages/album";
import ArtistPage, { loader as artistPageLoader } from "./pages/artist";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "artists/:id",
        element: <ArtistPage />,
        loader: artistPageLoader,
      },
      {
        path: "albums/:id",
        element: <AlbumPage />,
        loader: albumPageLoader,
      },
      {
        path: "notes/:id",
        element: <div></div>,
      },
    ],
  },
]);

export default router;
