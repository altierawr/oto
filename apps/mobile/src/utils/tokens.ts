export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Add a 30s buffer so we refresh slightly before actual expiry
    return payload.exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
};
