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
import { Pencil } from 'lucide-react';

const cardClass =
  'w-full max-w-md backdrop-blur-md bg-white/80 dark:bg-slate-950/80 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 p-6 sm:p-7';

const labelClass = 'text-sm font-medium text-slate-700 dark:text-slate-200';
const inputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-shadow focus:ring-2 focus:ring-teal-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const primaryButtonClass =
  'w-full rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60';

const resetAccentSubmitClass =
  'w-full rounded-lg bg-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-teal-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60';

const sendCodeButtonClass =
  'w-full rounded-lg border-2 border-teal-500 bg-transparent px-4 py-3 text-sm font-semibold text-teal-600 shadow-none transition-all duration-200 hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-400 dark:text-teal-400 dark:hover:bg-teal-400/10';

const forgotPasswordLinkClass =
  'inline-flex bg-transparent p-0 text-xs font-medium text-teal-600 shadow-none ring-0 transition-colors hover:text-teal-700 hover:underline dark:text-teal-400 dark:hover:text-teal-300';

export const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

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
      setInlineError(resendVerificationCode?.message || 'Новий код надіслано');
    },
    onError: () => {},
  });

  const [forgotPassword, forgotState] = useMutation(FORGOT_PASSWORD, {
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

  const handleVerify = (codeOverride) => {
    if (verifyState.loading) return;
    const email = (emailForVerification || registerForm.email || '').trim().toLowerCase();
    const code = (codeOverride ?? verifyCode ?? '').toString().replace(/[^\d]/g, '').slice(0, 6);

    if (!email) {
      setInlineError('Вкажіть email для верифікації');
      return;
    }
    if (code.length !== 6) {
      setInlineError('Введіть 6-значний код');
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
      setResetBanner({ variant: 'error', text: 'Enter a valid email address' });
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
      setResetBanner({ variant: 'error', text: 'Invalid code' });
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetBanner({ variant: 'error', text: 'Password must be at least 6 characters' });
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
    <section className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className={cardClass}>
        {(authStep === 'login' || authStep === 'resetPassword') && (
          <>
            <div className="overflow-hidden w-full">
              <div
                className="flex w-[200%] transition-transform duration-300 ease-out motion-reduce:transition-none"
                style={{
                  transform: authStep === 'resetPassword' ? 'translateX(-50%)' : 'translateX(0)',
                }}
              >
                <div className="w-1/2 shrink-0 pr-3 box-border">
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Вхід</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Увійдіть, щоб продовжити роботу.
                    </p>
                  </div>

                  <form onSubmit={submitLogin} className="space-y-4">
                    <label className="block">
                      <span className={labelClass}>Email або username</span>
                      <input
                        className={inputClass}
                        type="text"
                        name="emailOrUsername"
                        value={loginForm.emailOrUsername}
                        onChange={(e) => setLoginForm((p) => ({ ...p, emailOrUsername: e.target.value }))}
                        placeholder="you@example.com"
                        autoComplete="username"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className={labelClass}>Пароль</span>
                      <input
                        className={inputClass}
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
                      <button type="button" className={forgotPasswordLinkClass} onClick={openResetPassword}>
                        Forgot password?
                      </button>
                    </div>

                    {loginBanner?.variant === 'success' ? (
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{loginBanner.text}</p>
                    ) : null}

                    {errorText ? <p className="text-sm text-rose-600 dark:text-rose-400">{errorText}</p> : null}

                    <button className={primaryButtonClass} type="submit" disabled={isBusy}>
                      {loginState.loading ? 'Входимо...' : 'Увійти'}
                    </button>

                    <button
                      type="button"
                      className="w-full text-sm text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
                      onClick={() => {
                        setInlineError('');
                        setAuthStep('register');
                        navigate('/register', { replace: true });
                      }}
                    >
                      Немає акаунта? Зареєструватися
                    </button>
                  </form>
                </div>

                <div className="w-1/2 shrink-0 pl-3 box-border">
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Reset Password
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Ми надішлемо код на вашу пошту.
                    </p>
                  </div>

                  <form onSubmit={handleResetPanelSubmit} className="space-y-4">
                    <label className="block">
                      <span className={labelClass}>Email</span>
                      <input
                        className={inputClass}
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </label>

                    <button
                      type="button"
                      className={sendCodeButtonClass}
                      onClick={submitForgotCode}
                      disabled={isBusy || forgotState.loading}
                    >
                      {forgotState.loading ? 'Sending...' : 'Send Code'}
                    </button>

                    {resetCodeSent ? (
                      <>
                        <label className="block animate-in fade-in duration-300">
                          <span className={labelClass}>Code</span>
                          <input
                            className={inputClass}
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

                        <label className="block animate-in fade-in duration-300">
                          <span className={labelClass}>New Password</span>
                          <input
                            className={inputClass}
                            type="password"
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            minLength={6}
                          />
                        </label>

                        <button className={resetAccentSubmitClass} type="submit" disabled={isBusy}>
                          {resetPwdState.loading ? 'Updating...' : 'Update Password'}
                        </button>
                      </>
                    ) : null}

                    {resetBanner ? (
                      <p
                        className={
                          resetBanner.variant === 'success'
                            ? 'text-sm font-medium text-emerald-600 dark:text-emerald-400'
                            : 'text-sm font-medium text-rose-600 dark:text-rose-400'
                        }
                      >
                        {resetBanner.text}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      className="w-full text-sm text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
                      onClick={backToLoginFromReset}
                    >
                      Back to login
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        {authStep === 'register' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Реєстрація</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Створіть акаунт і підтвердіть email кодом.
              </p>
            </div>

            <form onSubmit={submitRegister} className="space-y-4">
              <label className="block">
                <span className={labelClass}>Username</span>
                <input
                  className={inputClass}
                  type="text"
                  name="username"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))}
                  placeholder="username"
                  autoComplete="username"
                  required
                />
              </label>

              <label className="block">
                <span className={labelClass}>Email</span>
                <input
                  className={inputClass}
                  type="email"
                  name="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <span className={labelClass}>Пароль</span>
                <input
                  className={inputClass}
                  type="password"
                  name="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="мінімум 6 символів"
                  autoComplete="new-password"
                  required
                />
              </label>

              {errorText ? <p className="text-sm text-rose-600 dark:text-rose-400">{errorText}</p> : null}

              <button className={primaryButtonClass} type="submit" disabled={isBusy}>
                {registerState.loading ? 'Створюємо...' : 'Зареєструватися'}
              </button>

              <button
                type="button"
                className="w-full text-sm text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
                onClick={() => {
                  setInlineError('');
                  setAuthStep('login');
                  navigate('/login', { replace: true });
                }}
              >
                Вже є акаунт? Увійти
              </button>
            </form>
          </>
        )}

        {authStep === 'verify' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Перевірка пошти
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ми надіслали 6-значний код на{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {emailForVerification || registerForm.email}
                </span>{' '}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm font-medium text-teal-500 underline-offset-2 transition-colors hover:text-teal-600 hover:underline"
                  onClick={() => {
                    setInlineError('');
                    setVerifyCode('');
                    setResendTimer(60);
                    setEmailForVerification('');
                    setAuthStep('register');
                    navigate('/register', { replace: true });
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Змінити email
                </button>
                .
              </p>
            </div>

            <form onSubmit={submitVerify} className="space-y-4">
              <label className="block">
                <span className={labelClass}>Код</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[1em] text-slate-900 outline-none transition-shadow focus:ring-2 focus:ring-teal-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

              {errorText ? <p className="text-sm text-rose-600 dark:text-rose-400">{errorText}</p> : null}

              <button className={primaryButtonClass} type="submit" disabled={isBusy}>
                {verifyState.loading ? 'Перевіряємо...' : 'Підтвердити'}
              </button>

              <div className="flex flex-col items-center gap-2 pt-1">
                {resendTimer > 0 ? (
                  <p className="text-sm text-slate-400">
                    Надіслати код повторно через <span className="tabular-nums">{resendTimer}</span>с
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={resendState.loading}
                    className="text-sm font-medium text-teal-500 transition-colors hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      const email = (emailForVerification || registerForm.email || '').trim().toLowerCase();
                      if (!email) {
                        setInlineError('Вкажіть email для повторної відправки коду');
                        return;
                      }
                      setInlineError('');
                      resendCode({ variables: { email } });
                      setResendTimer(60);
                    }}
                  >
                    Не отримали код? Надіслати ще раз
                  </button>
                )}

                <button
                  type="button"
                  className="text-sm text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
                  onClick={() => {
                    setInlineError('');
                    setVerifyCode('');
                    setAuthStep('login');
                    navigate('/login', { replace: true });
                  }}
                >
                  Повернутися до входу
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

