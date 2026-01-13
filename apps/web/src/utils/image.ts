export const getTidalCoverUrl = (
  coverId: string | undefined | null,
  size: 80 | 320 | 1280 = 320,
) => {
  if (!coverId) return "";
  return `https://resources.tidal.com/images/${coverId.replace(
    /-/g,
    "/",
  )}/${size}x${size}.jpg`;
};
