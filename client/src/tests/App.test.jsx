import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import AccessibilityProvider from '../context/AccessibilityContext';
import AuthProvider from '../context/AuthContext';
import { MockedProvider } from '@apollo/client/testing/react';

beforeEach(() => {
  localStorage.setItem('authToken', 'test-token');
  localStorage.setItem('authUser', JSON.stringify({ username: 'Test User' }));
});

afterEach(() => {
  localStorage.clear();
});

test('renders the home heading', async () => {
  render(
    <MockedProvider mocks={[]} addTypename={false}>
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <AccessibilityProvider>
            <App /> 
          </AccessibilityProvider>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>
  );

  expect(await screen.findByText(/^PAIT$/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /translate/i })).toBeInTheDocument();
});
