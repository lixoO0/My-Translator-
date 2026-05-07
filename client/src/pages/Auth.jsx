import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { LOGIN_USER, REGISTER_USER, RESEND_VERIFICATION_CODE, VERIFY_EMAIL } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { Pencil } from 'lucide-react';

const cardClass =
  'w-full max-w-md backdrop-blur-md bg-white/80 dark:bg-slate-950/80 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 p-6 sm:p-7';

const labelClass = 'text-sm font-medium text-slate-700 dark:text-slate-200';
const inputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-shadow focus:ring-2 focus:ring-teal-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const primaryButtonClass =
  'w-full rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60';

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

  useEffect(() => {
    setAuthStep(initialStep);
    setInlineError('');
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
    loginUser({
      variables: {
        emailOrUsername: loginForm.emailOrUsername,
        password: loginForm.password,
      },
    });
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

  const isBusy = loginState.loading || registerState.loading || verifyState.loading || resendState.loading;

  return (
    <section className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className={cardClass}>
        {authStep === 'login' && (
          <>
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

