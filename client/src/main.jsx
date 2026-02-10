import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import './index.css';
import { apolloClient } from './apollo/client.js';
import { AccessibilityProvider } from './context/AccessibilityContext.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

console.log('Google ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ApolloProvider client={apolloClient}>
        <BrowserRouter>
          <AccessibilityProvider>
            <App />
          </AccessibilityProvider>
        </BrowserRouter>
      </ApolloProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
