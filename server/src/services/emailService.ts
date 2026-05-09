import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_PAIT = 'PAIT <auth@pait-app.xyz>';

export const sendVerificationEmail = async (email: string, code: string) => {
  try {
    console.log('=== ВІДПРАВКА ЧЕРЕЗ RESEND ===');
    await resend.emails.send({
      from: FROM_PAIT,
      to: email,
      subject: 'Ваш код підтвердження PAIT',
      html: `<strong>Ваш код: ${code}</strong>`,
    });
    console.log('=== RESEND: УСПІШНО ===');
  } catch (error) {
    console.error('=== ПОМИЛКА RESEND ===', error);
    throw new Error('Помилка відправки коду через API');
  }
};

export const sendPasswordResetEmail = async (email: string, code: string) => {
  try {
    console.log('=== RESEND: PASSWORD RESET ===');
    await resend.emails.send({
      from: FROM_PAIT,
      to: email,
      subject: 'Скидання пароля PAIT',
      html: `<p>Ваш код для скидання пароля:</p><strong>${code}</strong><p>Код дійсний 15 хвилин.</p>`,
    });
    console.log('=== RESEND: PASSWORD RESET OK ===');
  } catch (error) {
    console.error('=== ПОМИЛКА RESEND (RESET) ===', error);
    throw new Error('Помилка відправки коду через API');
  }
};
