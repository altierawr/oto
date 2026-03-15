# server

## 0.9.1

### Patch Changes

- 0dd5496: Added a background task for fetching missing tidal artists and albums.
- 79ad1b9: Slowed down tidal rate limiter to 1 request / sec.
- 2a6981a: Slowed down tidal service rate limiter.
- 87a5c4d: Fixed an issue where tidal background task would block the app from exiting.

## 0.9.0

### Minor Changes

- 566e5a2: Refactored tidal database tables & queries to no longer store data in json encoded format.

## 0.8.1

### Patch Changes

- b5501c6: Fixed an issue where favoriting some tracks didn't work.

## 0.8.0

### Minor Changes

- 35748d8: Added user top played tracks to the home page.
- 35748d8: Added recommended new tracks generation for users. They are visible on the home page once generated.

## 0.7.0

### Minor Changes

- e262b84: Add track scrobbling (saving track plays to the database).

## 0.6.1

### Patch Changes

- 7bed717: Improved autoplay handling; more tracks that previously didn't get any autoplay tracks added should now get some.

## 0.6.0

### Minor Changes

- 1297540: Adjusted autoplay to play more diverse tracks and avoid playing too many tracks from the same albums. The autoplay also now places higher weight on the original tracks selected to be played by the user.

## 0.5.0

### Minor Changes

- bdef899: Expired sessions are now cleaned up every 30 minutes. The cleanup deletes stream files and frees session data from memory.

## 0.4.0

### Minor Changes

- af1dcf3: Added autoplay

## 0.3.0

### Minor Changes

- bd7e400: Added rate limiting to all api endpoints.

## 0.2.0

### Minor Changes

- 24cf134: Added playlists.

## 0.1.0

### Minor Changes

- 101e93a: Added favoriting functionality & library page for viewing favorited content
