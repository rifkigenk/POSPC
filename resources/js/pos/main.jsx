import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './pos.css';

const rootElement = document.getElementById('pos-root');

if (!rootElement) {
    throw new Error('Elemen #pos-root tidak ditemukan.');
}

createRoot(rootElement).render(
    <StrictMode>
        <App appName={rootElement.dataset.appName} />
    </StrictMode>,
);
