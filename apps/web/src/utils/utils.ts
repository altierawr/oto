export const formatDuration = (duration: number) => {
  let hours = 0;
  let minutes = 0;

  while (duration >= 60 * 60) {
    hours++;
    duration -= 60 * 60;
  }

  while (duration >= 60) {
    minutes++;
    duration -= 60;
  }

  let secondsText = duration > 9 ? `${duration}` : `0${duration}`;

  return `${hours > 0 ? `${hours}:` : ""}${minutes}:${secondsText}`;
};
