/**
 * main.jsx - Entry point for the React application
 *
 * This file:
 * 1. Imports React and ReactDOM
 * 2. Imports global CSS (Tailwind)
 * 3. Renders the root App component into the DOM
 *
 * React.StrictMode wraps the app to highlight potential problems
 * during development (double-renders, deprecated APIs, etc.)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
