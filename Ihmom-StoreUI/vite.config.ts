import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
        resolve: {
            alias: [
                { find: '@', replacement: path.resolve(__dirname, './src') },
                // Generated UI primitives import through the tsconfig baseUrl.
                { find: /^src\//, replacement: `${path.resolve(__dirname, './src')}/` },
            ],
        },
        server: {
            proxy: {
                '/api': {
                    target:
                        env.VITE_NODE_ENV === 'development'
                            ? env.VITE_DEVELOPMENT_API_PROXY_TARGET
                            : env.VITE_DEPLOYMENT_API_PROXY_TARGET,
                    changeOrigin: true,
                },
            },
        },
    };
});
