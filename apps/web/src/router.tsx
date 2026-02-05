import { createBrowserRouter } from "react-router";

import AccountPage from "./pages/account";
import AlbumPage, { loader as albumPageLoader } from "./pages/album";
import AppRoot from "./pages/app-root";
import ArtistPage, { loader as artistPageLoader } from "./pages/artist";
import ArtistPageAlbums from "./pages/artist/albums";
import ArtistPageAppearsOn from "./pages/artist/appears-on";
import ArtistPageCompilations from "./pages/artist/compilations";
import ArtistPageSinglesAndEps from "./pages/artist/singles-eps";
import HomePage from "./pages/home";
import InvitePage from "./pages/invite";
import LoginRegisterPage from "./pages/login-register";
import Root from "./pages/root";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        children: [
          {
            path: "register",
            element: <LoginRegisterPage />,
          },
          {
            path: "login",
            element: <LoginRegisterPage />,
          },
          {
            path: "invite",
            element: <InvitePage />,
          },
          {
            path: "account",
            element: <AccountPage />,
          },
        ],
      },
      {
        element: <AppRoot />,
        path: "/",
        children: [
          {
            path: "/",
            element: <HomePage />,
          },
          {
            path: "artists/:id",
            id: "artist",
            element: <ArtistPage />,
            loader: artistPageLoader,
            children: [
              {
                path: "albums",
                element: <ArtistPageAlbums />,
              },
              {
                path: "singles-eps",
                element: <ArtistPageSinglesAndEps />,
              },
              {
                path: "compilations",
                element: <ArtistPageCompilations />,
              },
              {
                path: "appears-on",
                element: <ArtistPageAppearsOn />,
              },
            ],
          },
          {
            path: "albums/:id",
            element: <AlbumPage />,
            loader: albumPageLoader,
          },
        ],
      },
    ],
  },
]);

export default router;
