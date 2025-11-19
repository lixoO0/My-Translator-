import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { apolloClient } from './apollo/client.js';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>
);
