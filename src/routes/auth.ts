import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { generateMagicLink, verifyMagicLink, sendMagicLinkEmail } from '../auth/magic-link';
import { generateJWT } from '../auth/jwt';
import type { AuthResponse } from '../types/auth.types';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELD',
          message: 'Email is required'
        }
      });
    }

    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const token = await generateMagicLink(email);
    await sendMagicLinkEmail(email, token);

    res.json({
      message: `Magic link sent to ${email}`
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate magic link'
      }
    });
  }
});

router.get('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token is required'
        }
      });
    }

    const userId = await verifyMagicLink(token);

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    const userResult = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    const accessToken = generateJWT({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const response: AuthResponse = {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify token'
      }
    });
  }
});

export default router;

