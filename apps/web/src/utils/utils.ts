export const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const formatDuration = (dur: number, type: "digital" | "written") => {
  let seconds = Math.floor(dur);

  let hours = 0;
  let minutes = 0;

  while (seconds >= 60 * 60) {
    hours++;
    seconds -= 60 * 60;
  }

  while (seconds >= 60) {
    minutes++;
    seconds -= 60;
  }

  if (type === "digital") {
    let secondsText = seconds > 9 ? `${seconds}` : `0${seconds}`;

    return `${hours > 0 ? `${hours}:` : ""}${minutes}:${secondsText}`;
  }

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} hr`);
  }

  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes} min`);
  }

  if (hours === 0 && seconds > 0) {
    parts.push(`${seconds} sec`);
  }

  return parts.join(" ");
};
