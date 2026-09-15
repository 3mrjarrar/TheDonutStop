import { defineConfig } from 'vite';
export default defineConfig(({ isSsrBuild }) => ({
  esbuild: { jsx: 'automatic' },
  build: { assetsInlineLimit: 0, copyPublicDir: !isSsrBuild },
  plugins: [{
    name: 'preview-prerendered-menu',
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] === '/menu') request.url = request.url.replace('/menu', '/menu/');
        next();
      });
    },
  }],
}));
