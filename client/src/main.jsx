import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import './App.css';
import { apolloClient } from './apollo/client.js';
import { AccessibilityProvider } from './context/AccessibilityContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <HashRouter>
        <LanguageProvider>
          <AccessibilityProvider>
            <App />
          </AccessibilityProvider>
        </LanguageProvider>
      </HashRouter>
    </ApolloProvider>
  </React.StrictMode>
);
