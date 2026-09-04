
import React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary, RootErrorFallback } from './components/common/ErrorBoundary';
import { initMonitoring } from './lib/monitoring';
// Compiled at build time — replaces the former cdn.tailwindcss.com script so
// the packaged mobile apps render correctly with no network connection.
import './styles/index.css';

// Before the first render so a crash during mount is still reported.
initMonitoring();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* Last line of defence: sits above every provider, so its fallback must
        not depend on any of them. */}
    <ErrorBoundary scope="root" fallback={(props) => <RootErrorFallback {...props} />}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);