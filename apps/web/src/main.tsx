import '@fontsource/anton/latin-400.css';
import '@fontsource-variable/archivo/wdth.css';
import './styles/index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createQueryClient } from './api/queries';
import { App } from './App';
import { initInstallPrompt } from './hooks/useInstallPrompt';

initInstallPrompt();

const root = document.getElementById('root');
if (!root) throw new Error('#root introuvable');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
