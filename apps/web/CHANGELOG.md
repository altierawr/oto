# web

## 0.8.0

### Minor Changes

- 78b5bbe: Added currently playing track data (title, artist, cover picture) to mediaSession. The track info will now show for example on phones when the phone is locked or the browser is unfocused.
- 0c66c5a: Added support for controlling music playback via hardware like headsets, using the Media Session API.

## 0.7.0

### Minor Changes

- 1297540: Adjusted autoplay to play more diverse tracks and avoid playing too many tracks from the same albums. The autoplay also now places higher weight on the original tracks selected to be played by the user.

### Patch Changes

- 581aaf9: Fixed an issue where the favorite button in the desktop music controls bar wasn't updating properly.

## 0.6.0

### Minor Changes

- af1dcf3: Added autoplay

## 0.5.0

### Minor Changes

- bd7e400: Added rate limiting to all api endpoints.

## 0.4.0

### Minor Changes

- 24cf134: Added playlists.
- 7e2223a: Added favorite button to music controls bar on desktop

### Patch Changes

- 1582616: Fixed an issue where network requests to the server could get stalled.
- 9b5231d: Album page play button now updates properly when album is playing.

## 0.3.0

### Minor Changes

- 101e93a: Added favoriting functionality & library page for viewing favorited content

### Patch Changes

- 25a7639: Fixed an issue where album playback wasn't working on any album blocks other than on the artist overview page.

## 0.2.1

### Patch Changes

- 35d78bf: Added an alert if media playback isn't supported on the user's device (iPhone iOS)

## 0.2.0

### Minor Changes

- 96b5e9f: Added basic support to mobile devices

## 0.1.0

### Minor Changes

- 0e91b2a: Overhauled app styling & added a sticky navbar
- 0f0e813: Updated @awlt/design to 0.2.0
