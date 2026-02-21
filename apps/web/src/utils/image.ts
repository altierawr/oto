export const getTidalCoverUrl = (coverId: string | undefined | null, size: 80 | 320 | 750 | 1280 = 320) => {
  if (!coverId) return "";
  return `https://resources.tidal.com/images/${coverId.replace(/-/g, "/")}/${size}x${size}.jpg`;
};

export const getCoverUrl = (coverIdOrUrl: string | undefined | null, size: 80 | 320 | 750 | 1280 = 320) => {
  if (!coverIdOrUrl) return "";
  if (coverIdOrUrl.startsWith("http://") || coverIdOrUrl.startsWith("https://")) {
    return coverIdOrUrl;
  }

  return getTidalCoverUrl(coverIdOrUrl, size);
};
