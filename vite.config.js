import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In GitHub Actions, build with base path `/egg-site/` so assets resolve at
// https://USERNAME.github.io/egg-site/. Locally `npm run dev` stays at `/`.
const base = process.env.GITHUB_ACTIONS ? '/egg-site/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
});
