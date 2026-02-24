// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { DatabaseProvider } from './contexts/DatabaseContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DatabaseProvider>
      <App />
    </DatabaseProvider>
  </StrictMode>,
);