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
- [ ] Mixes (radio)
- [ ] Discovery playlists
- [ ] Automatic "play similar" functionality
- [ ] Playlists
- [ ] Favoriting songs, albums & artists
- [ ] Light theme

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
```

They can be either set by having a `.env` file in the same directory as the binary, or you can set them yourself in another way.

Then, just run the binary. You can verify that the server is working by sending a GET request to `http://localhost:3003/v1/healthcheck`.

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
