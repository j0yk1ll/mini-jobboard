import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
  },
  (table) => [index('session_user_id_idx').on(table.userId)]
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').notNull()
  },
  (table) => [index('account_user_id_idx').on(table.userId)]
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const stellenanzeigenStatus = pgEnum('stellenanzeigen_status', [
  'open',
  'closed'
]);

export const stellenanzeige = pgTable(
  'stellenanzeige',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recruiterId: text('recruiter_id')
      .notNull()
      .references(() => user.id),
    title: text('title').notNull(),
    description: text('description').notNull(),
    status: stellenanzeigenStatus('status').default('open').notNull()
  },
  (table) => [index('stellenanzeige_recruiter_id_idx').on(table.recruiterId)]
);

export const bewerbungsstatus = pgEnum('bewerbungsstatus', [
  'neu',
  'eingeladen',
  'abgelehnt'
]);

export const bewerbung = pgTable(
  'bewerbung',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stellenanzeigeId: uuid('stellenanzeige_id')
      .notNull()
      .references(() => stellenanzeige.id),
    name: text('name').notNull(),
    email: text('email').notNull(),
    text: text('text').notNull(),
    status: bewerbungsstatus('status').default('neu').notNull()
  },
  (table) => [
    unique('bewerbung_stellenanzeige_email_unique').on(
      table.stellenanzeigeId,
      table.email
    ),
    check(
      'bewerbung_email_normalized',
      sql`${table.email} = lower(${table.email} COLLATE "C")
        AND ${table.email} COLLATE "C" !~ '[^!-~]'`
    )
  ]
);
