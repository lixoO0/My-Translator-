import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { LOGIN_USER } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';

const initialState = {
  emailOrUsername: '',
  password: '',
};

export const Login = () => {
  const [formData, setFormData] = useState(initialState);
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginUser, { loading, error }] = useMutation(LOGIN_USER, {
    onCompleted: ({ login: authData }) => {
      login(authData);
      navigate('/');
    },
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    loginUser({
      variables: {
        emailOrUsername: formData.emailOrUsername,
        password: formData.password,
      },
    });
  };

  return (
    <section className="auth-section">
      <div className="auth-card">
        <h1 className="auth-title">Login</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email or username
            <input
              type="text"
              name="emailOrUsername"
              placeholder="Email or username"
              value={formData.emailOrUsername}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </label>

          <div className="auth-links">
            <button type="button" className="link-button">
              Forgot password?
            </button>
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

        </form>

        {error && <p className="auth-error">{error.message}</p>}
      </div>
    </section>
  );
};

export default Login;

