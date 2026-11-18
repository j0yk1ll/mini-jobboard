import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { isAPIError } from 'better-auth/api';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '#lib/password.ts';
import { getAuth } from './auth';

export async function submitCredentials(
  { request }: RequestEvent,
  mode: 'register' | 'sign-in'
) {
  const form = await request.formData();
  const email = form.get('email');
  const password = form.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return fail(400, {
      message: 'Gib eine E-Mail-Adresse und ein Passwort ein.'
    });
  }

  const address = email.trim();
  const auth = getAuth();

  try {
    if (mode === 'register') {
      await auth.api.signUpEmail({
        body: { email: address, password, name: address },
        headers: request.headers
      });
    } else {
      await auth.api.signInEmail({
        body: { email: address, password },
        headers: request.headers
      });
    }
  } catch (error) {
    if (!isAPIError(error) || error.statusCode >= 500) throw error;

    if (mode === 'register') {
      if (
        error.body?.code === 'INVALID_EMAIL' ||
        error.body?.code === 'VALIDATION_ERROR'
      ) {
        return fail(400, {
          email: address,
          message: 'Gib eine gültige E-Mail-Adresse ein.'
        });
      }
      if (error.body?.code === 'PASSWORD_TOO_SHORT') {
        return fail(400, {
          email: address,
          message: `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`
        });
      }
      if (error.body?.code === 'PASSWORD_TOO_LONG') {
        return fail(400, {
          email: address,
          message: `Das Passwort darf höchstens ${MAX_PASSWORD_LENGTH} Zeichen haben.`
        });
      }
      return fail(400, {
        email: address,
        message: 'Die Registrierung war nicht möglich.'
      });
    }

    return fail(400, {
      email: address,
      message: 'E-Mail-Adresse oder Passwort ist ungültig.'
    });
  }

  redirect(303, '/recruiter');
}
