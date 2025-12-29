import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@endurance.build';
const FROM_NAME = process.env.FROM_NAME || 'Endurance OS';

let resendClient: Resend | null = null;

if (RESEND_API_KEY) {
  resendClient = new Resend(RESEND_API_KEY);
}

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  if (!resendClient) {
    console.warn('⚠️  RESEND_API_KEY not set. Email not sent (simulation mode).');
    console.log(`📧 Would send to: ${to}`);
    console.log(` subject: ${subject}`);
    return false;
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      return false;
    }

    console.log('✅ Email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('❌ Email send exception:', error);
    return false;
  }
};

export const isEmailConfigured = (): boolean => {
  return RESEND_API_KEY !== undefined && RESEND_API_KEY !== '';
};

