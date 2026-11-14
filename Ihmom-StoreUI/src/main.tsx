import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './i18n';
import './styles/index.css';

import { App } from '@/app/App.tsx';
import { AppProviders } from '@/app/providers/AppProviders.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppProviders>
            <App />
        </AppProviders>
    </StrictMode>,
);
