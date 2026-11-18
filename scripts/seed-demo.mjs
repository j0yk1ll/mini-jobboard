import console from 'node:console';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';

const demoRecruiters = [
  {
    id: 'demo-recruiter-nord',
    email: 'recruiter-nord@example.test',
    name: 'Recruiter Nord',
    stellenanzeigen: [
      {
        title: 'Softwareentwicklung Nord',
        description:
          'Entwickle im Team eine Webanwendung für den öffentlichen Nahverkehr.',
        status: 'open',
        bewerbung: {
          name: 'Alex Winter',
          email: 'alex.winter@example.test',
          text: 'Ich entwickle Webanwendungen und möchte meine Erfahrung im Nahverkehr einsetzen.'
        }
      },
      {
        title: 'Projektassistenz Nord',
        description:
          'Unterstütze die Planung und Organisation eines Nahverkehrsprojekts.',
        status: 'closed'
      }
    ]
  },
  {
    id: 'demo-recruiter-sued',
    email: 'recruiter-sued@example.test',
    name: 'Recruiter Süd',
    stellenanzeigen: [
      {
        title: 'Produktdesign Süd',
        description:
          'Gestalte barrierearme Oberflächen für eine digitale Bibliothek.',
        status: 'open',
        bewerbung: {
          name: 'Robin Sommer',
          email: 'robin.sommer@example.test',
          text: 'Ich bringe Erfahrung aus der Gestaltung barrierearmer Bibliotheksangebote mit.'
        }
      }
    ]
  }
];

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  for (const {
    id: recruiterId,
    email,
    name,
    stellenanzeigen
  } of demoRecruiters) {
    const recruiter = await client.query(
      `INSERT INTO "user" (id, email, name, updated_at)
       VALUES ($1, $2, $3, now()) ON CONFLICT (email) DO NOTHING`,
      [recruiterId, email, name]
    );
    if (recruiter.rowCount === 0) {
      const {
        rows: [existing]
      } = await client.query('SELECT id FROM "user" WHERE email = $1', [email]);
      if (existing?.id !== recruiterId) {
        console.warn(
          `Demo-Konto ${email} übersprungen. Die Adresse ist bereits vergeben.`
        );
      }
      continue;
    }

    await client.query(
      `INSERT INTO account (id, account_id, provider_id, user_id, password, updated_at)
       VALUES ($1, $2, 'credential', $2, $3, now())`,
      [randomUUID(), recruiterId, await hashPassword('Jobboard-Demo-2026')]
    );
    for (const { title, description, status, bewerbung } of stellenanzeigen) {
      const {
        rows: [stellenanzeige]
      } = await client.query(
        `INSERT INTO stellenanzeige (recruiter_id, title, description, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [recruiterId, title, description, status]
      );
      if (!bewerbung) continue;
      await client.query(
        `INSERT INTO bewerbung (stellenanzeige_id, name, email, text)
         VALUES ($1, $2, $3, $4)`,
        [stellenanzeige.id, bewerbung.name, bewerbung.email, bewerbung.text]
      );
    }
  }
  await client.query('COMMIT');
} finally {
  await client.end();
}
