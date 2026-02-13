export const shuffle = (a) => {
  const s = [...a];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
};

export const pick = (a, n) => shuffle(a).slice(0, n);

export const genCode = () =>
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    .split("")
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .join("");
