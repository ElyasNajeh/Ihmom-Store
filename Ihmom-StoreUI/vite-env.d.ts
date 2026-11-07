interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_DEVELOPMENT_API_URL: string;
    readonly VITE_DEVELOPMENT_API_PROXY_TARGET: string;
    readonly VITE_DEPLOYMENT_API_URL: string;
    readonly VITE_DEPLOYMENT_API_PROXY_TARGET: string;
    readonly VITE_NODE_ENV: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
