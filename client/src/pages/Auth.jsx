import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import {
  FORGOT_PASSWORD,
  LOGIN_USER,
  REGISTER_USER,
  RESET_PASSWORD,
  RESEND_VERIFICATION_CODE,
  VERIFY_EMAIL,
} from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Pencil } from 'lucide-react';

function inlineAlertClass(message) {
  if (!message) return '';
  if (
    /надіслано|Надіслано|верифікації|sent to your email|verification|new code has been sent|code sent|successfully updated/i.test(
      message
    )
  ) {
    return 'pait-alert pait-alert--success';
  }
  return 'pait-alert pait-alert--error';
}

export const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();

  const initialStep = useMemo(() => {
    if (location.pathname === '/register') return 'register';
    return 'login';
  }, [location.pathname]);

  const [authStep, setAuthStep] = useState(initialStep); // 'login' | 'register' | 'verify'
  const [emailForVerification, setEmailForVerification] = useState('');

  const [loginForm, setLoginForm] = useState({ emailOrUsername: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });
  const [verifyCode, setVerifyCode] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetBanner, setResetBanner] = useState(null);
  const [loginBanner, setLoginBanner] = useState(null);

  useEffect(() => {
    setAuthStep(initialStep);
    setInlineError('');
    if (initialStep === 'login') {
      setResetBanner(null);
    }
  }, [initialStep]);

  useEffect(() => {
    if (authStep !== 'verify') return;
    setResendTimer(60);
    setInlineError('');
    setVerifyCode('');
  }, [authStep]);

  useEffect(() => {
    if (authStep !== 'verify') return;
    if (resendTimer <= 0) return;

    const id = setInterval(() => {
      setResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    return () => clearInterval(id);
  }, [authStep, resendTimer]);

  const [loginUser, loginState] = useMutation(LOGIN_USER, {
    onCompleted: ({ login: authData }) => {
      login(authData);
      navigate('/');
    },
    onError: () => {},
  });

  const [registerUser, registerState] = useMutation(REGISTER_USER, {
    onCompleted: ({ register }) => {
      setEmailForVerification(registerForm.email.trim().toLowerCase());
      setAuthStep('verify');
      setInlineError(register?.message || '');
    },
    onError: () => {},
  });

  const [verifyEmail, verifyState] = useMutation(VERIFY_EMAIL, {
    onCompleted: ({ verifyEmail: authData }) => {
      login(authData);
      navigate('/');
    },
    onError: () => {},
  });

  const [resendCode, resendState] = useMutation(RESEND_VERIFICATION_CODE, {
    onCompleted: ({ resendVerificationCode }) => {
      setInlineError(resendVerificationCode?.message || t('auth.new_code_sent'));
    },
    onError: () => {},
  });

  const [forgotPassword, forgotState] = useMutation(FORGOT_PASSWORD, {
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

  const [resetPasswordMut, resetPwdState] = useMutation(RESET_PASSWORD, {
    onCompleted: ({ resetPassword: rp }) => {
      setResetEmail('');
      setResetCode('');
      setResetNewPassword('');
      setResetCodeSent(false);
      setResetBanner(null);
      setAuthStep('login');
      navigate('/login', { replace: true });
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

  const handleVerify = (codeOverride) => {
    if (verifyState.loading) return;
    const email = (emailForVerification || registerForm.email || '').trim().toLowerCase();
    const code = (codeOverride ?? verifyCode ?? '').toString().replace(/[^\d]/g, '').slice(0, 6);

    if (!email) {
      setInlineError(t('auth.validation_email_verify'));
      return;
    }
    if (code.length !== 6) {
      setInlineError(t('auth.validation_code_6'));
      return;
    }

    setInlineError('');
    verifyEmail({
      variables: {
        email,
        code,
      },
    });
  };

  const submitLogin = (e) => {
    e.preventDefault();
    setInlineError('');
    setLoginBanner(null);
    loginUser({
      variables: {
        emailOrUsername: loginForm.emailOrUsername,
        password: loginForm.password,
      },
    });
  };

  const openResetPassword = () => {
    setInlineError('');
    setResetBanner(null);
    const raw = loginForm.emailOrUsername.trim();
    setResetEmail(raw.includes('@') ? raw.toLowerCase() : '');
    setResetCode('');
    setResetNewPassword('');
    setResetCodeSent(false);
    setAuthStep('resetPassword');
  };

  const backToLoginFromReset = () => {
    setAuthStep('login');
    navigate('/login', { replace: true });
    setResetBanner(null);
    setResetCodeSent(false);
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

  const submitForgotCode = (e) => {
    e.preventDefault();
    sendResetCode();
  };

  const submitResetPassword = (e) => {
    e.preventDefault();
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
      variables: {
        email,
        code,
        newPassword: resetNewPassword,
      },
    });
  };

  const handleResetPanelSubmit = (e) => {
    e.preventDefault();
    if (!resetCodeSent) {
      sendResetCode();
      return;
    }
    submitResetPassword(e);
  };

  const submitRegister = (e) => {
    e.preventDefault();
    setInlineError('');
    registerUser({
      variables: {
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
      },
    });
  };

  const submitVerify = (e) => {
    e.preventDefault();
    handleVerify();
  };

  const errorText =
    inlineError ||
    loginState.error?.message ||
    registerState.error?.message ||
    verifyState.error?.message ||
    resendState.error?.message ||
    '';

  const isBusy =
    loginState.loading ||
    registerState.loading ||
    verifyState.loading ||
    resendState.loading ||
    forgotState.loading ||
    resetPwdState.loading;

  return (
    <section className="pait-auth-screen">
      <div className="pait-auth-card">
        {(authStep === 'login' || authStep === 'resetPassword') && (
          <>
            <div className="pait-auth-slide-wrap w-full">
              <div
                className="flex w-[200%] transition-transform duration-300 ease-out motion-reduce:transition-none"
                style={{
                  transform: authStep === 'resetPassword' ? 'translateX(-50%)' : 'translateX(0)',
                }}
              >
                <div className="w-1/2 shrink-0 pr-3 box-border">
                  <h1 className="pait-auth-heading">{t('auth.login_title')}</h1>
                  <p className="pait-auth-lead">{t('auth.login_lead')}</p>

                  <form onSubmit={submitLogin} className="pait-auth-form">
                    <label className="pait-auth-field">
                      <span className="pait-auth-label">{t('auth.email_or_username')}</span>
                      <input
                        className="pait-auth-input"
                        type="text"
                        name="emailOrUsername"
                        value={loginForm.emailOrUsername}
                        onChange={(e) => setLoginForm((p) => ({ ...p, emailOrUsername: e.target.value }))}
                        placeholder={t('auth.placeholder_email')}
                        autoComplete="username"
                        required
                      />
                    </label>

                    <label className="pait-auth-field">
                      <span className="pait-auth-label">{t('auth.password')}</span>
                      <input
                        className="pait-auth-input"
                        type="password"
                        name="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                    </label>

                    <div className="flex justify-end">
                      <button type="button" className="pait-auth-link pait-auth-link--right" onClick={openResetPassword}>
                        {t('auth.forgot_password')}
                      </button>
                    </div>

                    {loginBanner?.variant === 'success' ? (
                      <p className="pait-alert pait-alert--success">{loginBanner.text}</p>
                    ) : null}

                    {errorText && authStep === 'login' ? (
                      <p className={inlineAlertClass(errorText)}>{errorText}</p>
                    ) : null}

                    <button className="pait-auth-submit" type="submit" disabled={loginState.loading}>
                      {loginState.loading ? t('auth.sign_in_loading') : t('auth.sign_in')}
                    </button>

                    <button
                      type="button"
                      className="pait-auth-link"
                      onClick={() => {
                        setInlineError('');
                        setAuthStep('register');
                        navigate('/register', { replace: true });
                      }}
                    >
                      {t('auth.no_account')}
                    </button>
                  </form>
                </div>

                <div className="w-1/2 shrink-0 pl-3 box-border">
                  <h1 className="pait-auth-heading">{t('auth.reset_title')}</h1>
                  <p className="pait-auth-lead">{t('auth.reset_lead')}</p>

                  <form onSubmit={handleResetPanelSubmit} className="pait-auth-form">
                    <label className="pait-auth-field">
                      <span className="pait-auth-label">{t('auth.email')}</span>
                      <input
                        className="pait-auth-input"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder={t('auth.placeholder_email')}
                        autoComplete="email"
                        required
                      />
                    </label>

                    <button
                      type="button"
                      className="pait-auth-outline-btn"
                      onClick={submitForgotCode}
                      disabled={forgotState.loading}
                    >
                      {forgotState.loading ? t('auth.send_code_loading') : t('auth.send_code')}
                    </button>

                    {resetCodeSent ? (
                      <>
                        <label className="pait-auth-field">
                          <span className="pait-auth-label">{t('auth.code')}</span>
                          <input
                            className="pait-auth-input"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={resetCode}
                            onChange={(e) =>
                              setResetCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))
                            }
                            placeholder="••••••"
                            maxLength={6}
                          />
                        </label>

                        <label className="pait-auth-field">
                          <span className="pait-auth-label">{t('auth.new_password')}</span>
                          <input
                            className="pait-auth-input"
                            type="password"
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            minLength={6}
                          />
                        </label>

                        <button className="pait-auth-submit" type="submit" disabled={resetPwdState.loading}>
                          {resetPwdState.loading ? t('auth.update_password_loading') : t('auth.update_password')}
                        </button>
                      </>
                    ) : null}

                    {resetBanner ? (
                      <p
                        className={
                          resetBanner.variant === 'success'
                            ? 'pait-alert pait-alert--success'
                            : 'pait-alert pait-alert--error'
                        }
                      >
                        {resetBanner.text}
                      </p>
                    ) : null}

                    <button type="button" className="pait-auth-link" onClick={backToLoginFromReset}>
                      {t('auth.back_to_login')}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        {authStep === 'register' && (
          <>
            <h1 className="pait-auth-heading">{t('auth.register_title')}</h1>
            <p className="pait-auth-lead">{t('auth.register_lead')}</p>

            <form onSubmit={submitRegister} className="pait-auth-form">
              <label className="pait-auth-field">
                <span className="pait-auth-label">{t('auth.username')}</span>
                <input
                  className="pait-auth-input"
                  type="text"
                  name="username"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))}
                  placeholder={t('auth.placeholder_username')}
                  autoComplete="username"
                  required
                />
              </label>

              <label className="pait-auth-field">
                <span className="pait-auth-label">{t('auth.email')}</span>
                <input
                  className="pait-auth-input"
                  type="email"
                  name="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder={t('auth.placeholder_email')}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="pait-auth-field">
                <span className="pait-auth-label">{t('auth.password')}</span>
                <input
                  className="pait-auth-input"
                  type="password"
                  name="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder={t('auth.password_min_placeholder')}
                  autoComplete="new-password"
                  required
                />
              </label>

              {errorText ? <p className={inlineAlertClass(errorText)}>{errorText}</p> : null}

              <button className="pait-auth-submit" type="submit" disabled={registerState.loading}>
                {registerState.loading ? t('auth.register_loading') : t('auth.register_btn')}
              </button>

              <button
                type="button"
                className="pait-auth-link"
                onClick={() => {
                  setInlineError('');
                  setAuthStep('login');
                  navigate('/login', { replace: true });
                }}
              >
                {t('auth.have_account')}
              </button>
            </form>
          </>
        )}

        {authStep === 'verify' && (
          <>
            <h1 className="pait-auth-heading">{t('auth.verify_title')}</h1>
            <p className="pait-auth-lead">
              {t('auth.verify_lead')}{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {emailForVerification || registerForm.email}
              </span>{' '}
              <button
                type="button"
                className="pait-auth-link"
                style={{ display: 'inline', width: 'auto', verticalAlign: 'baseline' }}
                onClick={() => {
                  setInlineError('');
                  setVerifyCode('');
                  setResendTimer(60);
                  setEmailForVerification('');
                  setAuthStep('register');
                  navigate('/register', { replace: true });
                }}
              >
                <span className="inline-flex items-center gap-1">
                  <Pencil className="h-4 w-4" />
                  {t('auth.change_email')}
                </span>
              </button>
              .
            </p>

            <form onSubmit={submitVerify} className="pait-auth-form">
              <label className="pait-auth-field">
                <span className="pait-auth-label">{t('auth.code')}</span>
                <input
                  className="pait-auth-input pait-auth-input--otp"
                  value={verifyCode}
                  onChange={(e) => {
                    const newCode = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                    setVerifyCode(newCode);
                    if (newCode.length === 6) {
                      handleVerify(newCode);
                    }
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  maxLength={6}
                  required
                />
              </label>

              {errorText ? <p className={inlineAlertClass(errorText)}>{errorText}</p> : null}

              <button className="pait-auth-submit" type="submit" disabled={verifyState.loading}>
                {verifyState.loading ? t('auth.confirm_loading') : t('auth.confirm')}
              </button>

              <div className="flex flex-col items-center gap-2 pt-1">
                {resendTimer > 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t('auth.resend_in')}{' '}
                    <span className="tabular-nums">{resendTimer}</span>{' '}
                    {t('auth.sec_unit')}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={resendState.loading}
                    className="pait-auth-link"
                    onClick={() => {
                      const email = (emailForVerification || registerForm.email || '').trim().toLowerCase();
                      if (!email) {
                        setInlineError(t('auth.validation_email_resend'));
                        return;
                      }
                      setInlineError('');
                      resendCode({ variables: { email } });
                      setResendTimer(60);
                    }}
                  >
                    {t('auth.resend_btn')}
                  </button>
                )}

                <button
                  type="button"
                  className="pait-auth-link"
                  onClick={() => {
                    setInlineError('');
                    setVerifyCode('');
                    setAuthStep('login');
                    navigate('/login', { replace: true });
                  }}
                >
                  {t('auth.back_login')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
};

export default Auth;

