import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { appLogCollector, installLogCollector } from './bugReport/logCollector';

// Les erreurs et avertissements sont mémorisés pour être joints aux rapports de bug.
installLogCollector(appLogCollector);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
