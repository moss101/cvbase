
import React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
// Compiled at build time — replaces the former cdn.tailwindcss.com script so
// the packaged mobile apps render correctly with no network connection.
import './styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);