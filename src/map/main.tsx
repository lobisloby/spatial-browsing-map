import React from 'react';
import ReactDOM from 'react-dom/client';
import { MapApp } from './App';
import '@/styles/globals.css';
import '@/styles/map.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MapApp />
  </React.StrictMode>,
);