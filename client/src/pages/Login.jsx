import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { FORGOT_PASSWORD, LOGIN_USER, RESET_PASSWORD } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const initialLoginState = {
  emailOrUsername: '',
  password: '',
};

export const Login = () => {
  const { t } = useLanguage();
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
        text: fp?.message || t('auth.code_sent_email'),
      });
    },
    onError: (err) => {
      setResetBanner({
        variant: 'error',
        text: err.message || t('auth.something_wrong'),
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
        text: rp?.message || t('auth.password_updated'),
      });
    },
    onError: (err) => {
      setResetBanner({
        variant: 'error',
        text: err.message.includes('Invalid') ? t('auth.validation_invalid_code') : err.message,
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
      setResetBanner({ variant: 'error', text: t('auth.validation_invalid_email') });
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
      setResetBanner({ variant: 'error', text: t('auth.validation_invalid_code') });
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetBanner({ variant: 'error', text: t('auth.validation_password_min') });
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
              <h1 className="auth-title">{t('auth.login_title')}</h1>

              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <label>
                  {t('auth.email_or_username')}
                  <input
                    type="text"
                    name="emailOrUsername"
                    placeholder={t('auth.email_or_username')}
                    value={loginForm.emailOrUsername}
                    onChange={handleLoginChange}
                    required
                  />
                </label>

                <label>
                  {t('auth.password')}
                  <input
                    type="password"
                    name="password"
                    placeholder={t('auth.password')}
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    required
                  />
                </label>

                <div className="auth-links">
                  <button type="button" className="auth-link-forgot" onClick={openReset}>
                    {t('auth.forgot_password')}
                  </button>
                </div>

                {loginBanner?.variant === 'success' ? (
                  <p className="auth-status auth-status--success">{loginBanner.text}</p>
                ) : null}

                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? t('auth.sign_in_loading') : t('auth.sign_in')}
                </button>
              </form>

              {error && <p className="auth-error">{error.message}</p>}
            </div>

            <div className="auth-panel">
              <h1 className="auth-title">{t('auth.reset_title')}</h1>

              <form className="auth-form" onSubmit={handleResetPanelSubmit}>
                <label>
                  {t('auth.email')}
                  <input
                    type="email"
                    placeholder={t('auth.placeholder_email')}
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
                  disabled={forgotLoading}
                >
                  {forgotLoading ? t('auth.send_code_loading') : t('auth.send_code')}
                </button>

                {resetCodeSent ? (
                  <>
                    <label>
                      {t('auth.code')}
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
                      {t('auth.new_password')}
                      <input
                        type="password"
                        placeholder={t('auth.new_password')}
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={6}
                      />
                    </label>

                    <button className="auth-submit-reset" type="submit" disabled={resetLoading}>
                      {resetLoading ? t('auth.update_password_loading') : t('auth.update_password')}
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
                  {t('auth.back_to_login')}
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
