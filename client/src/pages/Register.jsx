import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { REGISTER_USER } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';

const initialState = {
  username: '',
  email: '',
  password: '',
};

export const Register = () => {
  const [formData, setFormData] = useState(initialState);
  const navigate = useNavigate();
  const { login } = useAuth();

  const [registerUser, { loading, error }] = useMutation(REGISTER_USER, {
    onCompleted: ({ register }) => {
      login(register);
      navigate('/');
    },
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    registerUser({
      variables: {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      },
    });
  };

  return (
    <section className="auth-section">
      <div className="auth-card">
        <h1 className="auth-title">Create account</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
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

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        {error && <p className="auth-error">{error.message}</p>}
      </div>
    </section>
  );
};

export default Register;

