import { getRequestEvent } from '$app/server';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { drizzle } from 'drizzle-orm/node-postgres';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '#lib/password.ts';
import * as schema from './schema';

function createAuth() {
  const { DATABASE_URL, BETTER_AUTH_SECRET, ORIGIN } = process.env;
  if (!DATABASE_URL || !BETTER_AUTH_SECRET || !ORIGIN) {
    throw new Error('DATABASE_URL, BETTER_AUTH_SECRET and ORIGIN are required');
  }

  return betterAuth({
    baseURL: ORIGIN,
    secret: BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(DATABASE_URL), {
      provider: 'pg',
      schema,
      transaction: true
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
      requireEmailVerification: false,
      autoSignIn: true
    },
    plugins: [sveltekitCookies(getRequestEvent)]
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return (auth ??= createAuth());
}
