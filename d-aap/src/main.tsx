import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.jsx';
import './styles/index.css';
import '@rainbow-me/rainbowkit/styles.css';
import { ErrorBoundary } from './components/common/error-boundary.jsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
);
