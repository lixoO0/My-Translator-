import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email: string, code: string) => {
  try {
    console.log('=== ВІДПРАВКА ЧЕРЕЗ RESEND ===');
    await resend.emails.send({
      from: 'onboarding@resend.dev', // На безкоштовному тарифі тільки так
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
