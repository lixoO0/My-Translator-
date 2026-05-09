import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { FORGOT_PASSWORD, LOGIN_USER, RESET_PASSWORD } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';

const initialLoginState = {
  emailOrUsername: '',
  password: '',
};

export const Login = () => {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetBanner, setResetBanner] = useState(null);
  const [loginBanner, setLoginBanner] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginUser, { loading, error }] = useMutation(LOGIN_USER, {
    onCompleted: ({ login: authData }) => {
      login(authData);
      navigate('/');
    },
  });

  const [forgotPassword, { loading: forgotLoading }] = useMutation(FORGOT_PASSWORD, {
    onCompleted: ({ forgotPassword: fp }) => {
      setResetCodeSent(true);
      setResetBanner({
        variant: 'success',
        text: fp?.message || 'Code sent to your email!',
      });
    },
    onError: (err) => {
      setResetBanner({
        variant: 'error',
        text: err.message || 'Something went wrong',
      });
    },
  });

  const [resetPasswordMut, { loading: resetLoading }] = useMutation(RESET_PASSWORD, {
    onCompleted: ({ resetPassword: rp }) => {
      setResetEmail('');
      setResetCode('');
      setResetNewPassword('');
      setResetCodeSent(false);
      setResetBanner(null);
      setMode('login');
      setLoginBanner({
        variant: 'success',
        text: rp?.message || 'Password updated successfully',
      });
    },
    onError: (err) => {
      setResetBanner({
        variant: 'error',
        text: err.message.includes('Invalid') ? 'Invalid code' : err.message,
      });
    },
  });

  const busy = loading || forgotLoading || resetLoading;

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    setLoginBanner(null);
    loginUser({
      variables: {
        emailOrUsername: loginForm.emailOrUsername,
        password: loginForm.password,
      },
    });
  };

  const openReset = () => {
    const raw = loginForm.emailOrUsername.trim();
    setResetEmail(raw.includes('@') ? raw.toLowerCase() : '');
    setResetCode('');
    setResetNewPassword('');
    setResetCodeSent(false);
    setResetBanner(null);
    setMode('reset');
  };

  const sendResetCode = () => {
    const email = resetEmail.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setResetBanner({ variant: 'error', text: 'Enter a valid email address' });
      return;
    }
    setResetBanner(null);
    forgotPassword({ variables: { email } });
  };

  const handleResetPanelSubmit = (event) => {
    event.preventDefault();
    if (!resetCodeSent) {
      sendResetCode();
      return;
    }
    const email = resetEmail.trim().toLowerCase();
    const code = resetCode.replace(/[^\d]/g, '').slice(0, 6);
    if (code.length !== 6) {
      setResetBanner({ variant: 'error', text: 'Invalid code' });
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetBanner({ variant: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setResetBanner(null);
    resetPasswordMut({
      variables: { email, code, newPassword: resetNewPassword },
    });
  };

  return (
    <section className="auth-section">
      <div className="auth-card">
        <div className="auth-panels-clip">
          <div
            className={`auth-panels-track ${mode === 'reset' ? 'auth-panels-track--reset' : ''}`}
          >
            <div className="auth-panel">
              <h1 className="auth-title">Login</h1>

              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <label>
                  Email or username
                  <input
                    type="text"
                    name="emailOrUsername"
                    placeholder="Email or username"
                    value={loginForm.emailOrUsername}
                    onChange={handleLoginChange}
                    required
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    required
                  />
                </label>

                <div className="auth-links">
                  <button type="button" className="auth-link-forgot" onClick={openReset}>
                    Forgot password?
                  </button>
                </div>

                {loginBanner?.variant === 'success' ? (
                  <p className="auth-status auth-status--success">{loginBanner.text}</p>
                ) : null}

                <button className="auth-submit" type="submit" disabled={busy}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              {error && <p className="auth-error">{error.message}</p>}
            </div>

            <div className="auth-panel">
              <h1 className="auth-title">Reset Password</h1>

              <form className="auth-form" onSubmit={handleResetPanelSubmit}>
                <label>
                  Email
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>

                <button
                  type="button"
                  className="auth-send-code"
                  onClick={(e) => {
                    e.preventDefault();
                    sendResetCode();
                  }}
                  disabled={busy}
                >
                  {forgotLoading ? 'Sending...' : 'Send Code'}
                </button>

                {resetCodeSent ? (
                  <>
                    <label>
                      Code
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="••••••"
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) =>
                          setResetCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))
                        }
                      />
                    </label>

                    <label>
                      New Password
                      <input
                        type="password"
                        placeholder="New password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={6}
                      />
                    </label>

                    <button className="auth-submit-reset" type="submit" disabled={busy}>
                      {resetLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </>
                ) : null}

                {resetBanner ? (
                  <p
                    className={`auth-status ${resetBanner.variant === 'success' ? 'auth-status--success' : 'auth-status--error'}`}
                  >
                    {resetBanner.text}
                  </p>
                ) : null}

                <button
                  type="button"
                  className="auth-link-forgot auth-link-forgot--center"
                  onClick={() => {
                    setMode('login');
                    setResetBanner(null);
                    setResetCodeSent(false);
                  }}
                >
                  Back to login
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
