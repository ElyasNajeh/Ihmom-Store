import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    timeout: 45000,
    workers: 1,
    use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium' },
    webServer: [
        {
            command: 'python tests/browser/server.py',
            url: 'http://127.0.0.1:18080/health',
            timeout: 60000,
        },
        {
            command: 'npm run dev -- --host 127.0.0.1 --port 4173',
            url: 'http://127.0.0.1:4173',
            env: { VITE_API_URL: '/api', VITE_DEVELOPMENT_API_PROXY_TARGET: 'http://127.0.0.1:18080' },
        },
    ],
});
