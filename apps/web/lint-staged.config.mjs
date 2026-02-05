export default {
  "*.{js,jsx,ts,tsx,mjs,cjs}": ["pnpm lint"],
  "*": "pnpm oxfmt --no-error-on-unmatched-pattern",
};
