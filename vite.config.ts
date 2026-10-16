import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// 코드에서 빼낸 API 키들 (Vercel 환경변수에 꼭 있어야 함)
const REQUIRED_ENV = ['VITE_FIREBASE_API_KEY', 'VITE_ACADEMY_ADMIN_API_KEY'];

export default defineConfig(({ command, mode }) => {
  // Vercel에서 빌드할 때 키가 빠져 있으면 빌드를 일부러 실패시킵니다.
  // → 망가진 사이트가 배포되지 않고, 기존에 잘 돌던 버전이 그대로 유지됩니다.
  if (command === 'build' && process.env.VERCEL) {
    const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
    const missing = REQUIRED_ENV.filter((k) => !env[k]);
    if (missing.length) {
      throw new Error(`[빌드 중단] Vercel 환경변수가 없습니다: ${missing.join(', ')} — Settings → Environment Variables에 추가 후 다시 배포하세요.`);
    }
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
