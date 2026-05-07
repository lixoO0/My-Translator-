import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER) {
  throw new Error('EMAIL_USER is not set in environment variables');
}
if (!EMAIL_PASS) {
  throw new Error('EMAIL_PASS is not set in environment variables');
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true для 465 порту
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000, // Збільшимо таймаут до 10 секунд
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

const buildVerificationHtml = (code: string) => {
  const safeCode = String(code || '').replace(/[^\d]/g, '').slice(0, 6);
  return `
  <div style="background:#0b1220;padding:32px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">
    <div style="max-width:560px;margin:0 auto;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:24px;padding:28px;color:#e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.35)">
      <div style="letter-spacing:0.22em;font-weight:800;font-size:12px;color:rgba(255,255,255,0.65);text-transform:uppercase">PAIT</div>
      <h1 style="margin:10px 0 6px;font-size:22px;line-height:1.2;color:#ffffff">Підтвердження пошти</h1>
      <p style="margin:0 0 18px;color:rgba(229,231,235,0.85);font-size:14px;line-height:1.6">
        Використайте цей 6-значний код, щоб завершити реєстрацію. Код дійсний короткий час.
      </p>
      <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:18px 16px;text-align:center">
        <div style="font-size:36px;letter-spacing:0.30em;font-weight:900;color:#ffffff">${safeCode}</div>
      </div>
      <p style="margin:18px 0 0;color:rgba(229,231,235,0.70);font-size:12px;line-height:1.6">
        Якщо ви не створювали акаунт — просто проігноруйте цей лист.
      </p>
    </div>
    <div style="max-width:560px;margin:12px auto 0;color:rgba(148,163,184,0.75);font-size:12px;text-align:center">
      © ${new Date().getFullYear()} PAIT
    </div>
  </div>
  `.trim();
};

export async function sendVerificationEmail(toEmail: string, code: string) {
  const html = buildVerificationHtml(code);
  try {
    await transporter.sendMail({
      from: `PAIT <${EMAIL_USER}>`,
      to: toEmail,
      subject: 'Ваш код підтвердження пошти',
      html,
    });
  } catch (error) {
    console.error('=== ПОМИЛКА EMAIL ===', error);
    throw new Error('Не вдалося надіслати код. Спробуйте пізніше.');
  }
}

