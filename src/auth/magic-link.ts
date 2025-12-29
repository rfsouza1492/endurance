import crypto from 'crypto';
import pool from '../config/database';
import { sendEmail, isEmailConfigured } from '../config/email';

const MAGIC_LINK_EXPIRES_IN_MINUTES = 15;

export async function generateMagicLink(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRES_IN_MINUTES * 60 * 1000);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  await pool.query(
    `UPDATE users 
     SET auth_token_hash = $1, auth_token_expires_at = $2::timestamptz
     WHERE email = $3`,
    [tokenHash, expiresAt.toISOString(), email]
  );

  return token;
}

export async function verifyMagicLink(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const result = await pool.query(
    `SELECT id, email, name, role 
     FROM users 
     WHERE auth_token_hash = $1 
       AND auth_token_expires_at > NOW()`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  await pool.query(
    `UPDATE users 
     SET auth_token_hash = NULL, 
         auth_token_expires_at = NULL,
         last_login_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  return user.id;
}

export async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify?token=${token}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>🔐 Magic Link de Acesso</h2>
          <p>Clique no botão abaixo para fazer login no Endurance OS:</p>
          <a href="${magicLink}" class="button">Fazer Login</a>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; color: #007bff;">${magicLink}</p>
          <p><strong>⏰ Este link expira em ${MAGIC_LINK_EXPIRES_IN_MINUTES} minutos.</strong></p>
          <div class="footer">
            <p>Se você não solicitou este link, ignore este email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const emailSent = await sendEmail(
    email,
    '🔐 Seu Magic Link de Acesso - Endurance OS',
    emailHtml
  );

  if (!emailSent) {
    console.log('\n🔐 Magic Link Generated (simulation mode):');
    console.log(`📧 Email: ${email}`);
    console.log(`🔗 Link: ${magicLink}`);
    console.log(`⏰ Expires in ${MAGIC_LINK_EXPIRES_IN_MINUTES} minutes\n`);
  }
}

