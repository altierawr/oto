<h1 align="center">oto</h1>
<h3 align="center">A self-hostable, gapless music server for Tidal with improved UI & UX</h3>

<p align="center">
<img alt="Logo" width=128 height=128 src="https://github.com/altierawr/oto/blob/master/apps/web/public/android-chrome-192x192.png"/>

---

This is oto, an application for listening to music from your Tidal subscription. Essentially, it is an alternative interface for you to listen to your music from Tidal. Using this application requires you to have an active paid Tidal subscription.

### But why?
The main reason I started developing this was because the implementation of gapless playback in Tidal applications is often broken. This is fixed with oto, which offers always-flawless gapless music playback between tracks, which is important in many albums where the tracks blend into each other.

Other than that, the Tidal applications (especially the web & desktop apps) have some UI & UX issues and annoyances. Oto aims to fix these issues with a completely custom user interface that offers a superior user experience to the official Tidal application.

On top of a custom interface, the oto server implements some additional features, like account creation support, which allows you to have multiple profiles for yourself.

### Features
Oto is still in early development and only the core features for listening to music gaplessly have been implemented so far. Here is a list of features that I have planned to implement in the near future.

- [x] Gapless playback
- [x] User accounts
- [x] Playlists
- [x] Favoriting songs, albums & artists
- [x] Automatic "play similar" functionality
- [ ] Mixes (radio)
- [ ] Discovery playlists
- [ ] Light theme

### Screenshots
| Artist page | Library page |
|:---|:---------------|
| <img width="2782" height="1708" alt="Artist page" src="https://github.com/user-attachments/assets/0d806c3e-0702-4b89-922f-f4f54e06759d" /> | <img width="2782" height="1708" alt="Library page" src="https://github.com/user-attachments/assets/fa59ace5-2b53-478e-8243-77d6f66aa9a9" /> |
| Search | Playlist page |
| <img width="2782" height="1708" alt="Search window" src="https://github.com/user-attachments/assets/0f67f5c7-aa5c-47ee-a8fe-04bcdd8c1c36" /> | <img width="2782" height="1708" alt="Playlist page" src="https://github.com/user-attachments/assets/e671a488-736c-483b-a976-da90437fa965" /> |

## Installation

### Server
Download the latest server binary for your system from the [releases page](https://github.com/altierawr/oto/releases).

The binary expects the following environment variables to be set:
```
TIDAL_ACCESS_TOKEN=Your tidal access token
TIDAL_REFRESH_TOKEN=Your tidal refresh token
TIDAL_CLIENT_ID=Client ID of tidal's application
TIDAL_SECRET=Secret of tidal's application

ACCESS_TOKEN_SECRET=A random string (HS256 base64 for example)
REFRESH_TOKEN_SECRET=A different random string (HS256 base64 for example)

LASTFM_API_KEY=Your last.fm API key
PORT=Optional, defaults to 3003
```

They can be either set by having a `.env` file in the same directory as the binary, or you can set them yourself in another way.

Then, just run the binary. You can verify that the server is working by sending a GET request to `http://localhost:3003/v1/healthcheck` (or the port from `PORT` if set).

### Web app
Requirements: `pnpm` installed on your system to build the web app

Clone the repository and build the web application:
```
git clone https://github.com/altierawr/oto.git
cd oto/apps/web
pnpm install
pnpm build
```

The application will be built in the `oto/apps/web/dist` folder.

Ensure the application has access to the environment variable `VITE_SERVER_URI` which should be the address where your server is running at.

You can then serve the `dist` folder to run the web application.

NOTE: for hosting, you will need to set up redirects for the router to work properly. For example, for Vercel, you need a `vercel.json` (included in the repository):
```
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

This project is not affiliated with or endorsed by TIDAL or any music streaming service. It is an independent project aimed at improving the experience of listening to music from your TIDAL subscription.

Using this project requires you to have an active TIDAL subscription to listen to music. This project does not encourage piracy, nor does it host, store, distribute or give you access to any media files or copyrighted content.
