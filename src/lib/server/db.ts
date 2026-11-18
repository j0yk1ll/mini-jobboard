import { drizzle } from 'drizzle-orm/node-postgres';

let db: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) throw new Error('DATABASE_URL is required');

  return (db ??= drizzle(DATABASE_URL));
}
