import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

const origin = process.env.TEST_ORIGIN ?? 'http://localhost:3000';

function request(path, { cookie, form } = {}) {
  return fetch(new URL(path, origin), {
    headers: {
      accept: 'text/html',
      ...(cookie && { cookie }),
      ...(form && { origin })
    },
    method: form ? 'POST' : 'GET',
    body: form && new URLSearchParams(form),
    redirect: 'manual'
  });
}

async function registerRecruiter() {
  const password = 'test-password-123';
  const response = await request('/registrieren', {
    form: {
      email: `recruiter-${randomUUID()}@example.com`,
      password,
      passwordConfirmation: password
    }
  });
  assert.equal(response.status, 303);
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.includes('.session_token='));
  assert.ok(cookie);
  return cookie.split(';', 1)[0];
}

test('Nur der angemeldete Recruiter veröffentlicht und sieht seine Stellenanzeige im eigenen Bereich', async () => {
  const title = `Softwareentwicklung ${randomUUID()}`;
  const form = {
    title,
    description: 'Wir suchen Verstärkung.',
    status: 'closed',
    recruiterId: 'fremd'
  };
  const anonymous = await request('/recruiter?/veroeffentlichen', { form });
  assert.equal(anonymous.status, 303);
  assert.equal(anonymous.headers.get('location'), '/anmelden');

  const cookie = await registerRecruiter();
  const published = await request('/recruiter?/veroeffentlichen', {
    cookie,
    form
  });
  assert.equal(published.status, 303);
  assert.equal(published.headers.get('location'), '/recruiter');

  const ownPage = await request('/recruiter', { cookie });
  assert.equal(ownPage.status, 200);
  assert.ok((await ownPage.text()).includes(`${title}</strong> · Offen`));

  const otherPage = await request('/recruiter', {
    cookie: await registerRecruiter()
  });
  assert.equal(otherPage.status, 200);
  assert.ok(!(await otherPage.text()).includes(title));
});

test('Der Server verlangt Titel und Beschreibung und prüft die Länge nach dem Trimmen', async () => {
  const cookie = await registerRecruiter();
  const validTitle = `A${randomUUID()}`.padEnd(120, 'z');
  const validDescription = 'x'.repeat(5000);

  for (const [form, message] of [
    [{ title: '   ', description: validDescription }, /Gib einen Titel ein/],
    [{ title: validTitle, description: ' \n ' }, /Gib eine Beschreibung ein/],
    [
      { title: `${validTitle}z`, description: validDescription },
      /Titel darf höchstens 120 Zeichen/
    ],
    [
      { title: validTitle, description: `${validDescription}x` },
      /Beschreibung darf höchstens 5000 Zeichen/
    ]
  ]) {
    const response = await request('/recruiter?/veroeffentlichen', {
      cookie,
      form
    });
    assert.equal(response.status, 400);
    assert.match(await response.text(), message);
  }

  const empty = await request('/recruiter', { cookie });
  assert.match(await empty.text(), /Du hast noch keine Stellenanzeigen/);

  const published = await request('/recruiter?/veroeffentlichen', {
    cookie,
    form: { title: ` ${validTitle} `, description: ` \n${validDescription}\n ` }
  });
  assert.equal(published.status, 303);
  const page = await request('/recruiter', { cookie });
  assert.ok((await page.text()).includes(`>${validTitle}</`));
});

test('Besucher finden offene Stellenanzeigen und lesen Beschreibungen als Klartext', async () => {
  assert.ok(
    process.env.DATABASE_URL,
    'DATABASE_URL muss auf die Testdatenbank der Anwendung zeigen'
  );
  const cookie = await registerRecruiter();
  const title = `Redaktion ${randomUUID()}`;
  const published = await request('/recruiter?/veroeffentlichen', {
    cookie,
    form: {
      title,
      description: '  Erste Zeile.\r\n\r\n<strong>Zweite Zeile.</strong>  '
    }
  });
  assert.equal(published.status, 303);

  const list = await request('/');
  assert.equal(list.status, 200);
  const link = (await list.text()).match(
    new RegExp(`<a href="([^" ]*stellenanzeigen/[^"/]+)">${title}</a>`)
  );
  assert.ok(link, 'Öffentliche Liste verlinkt die Stellenanzeige');

  const detail = await request(link[1]);
  assert.equal(detail.status, 200);
  const html = await detail.text();
  assert.match(html, new RegExp(`<h1\\b[^>]*>${title}</h1>`));
  assert.match(
    html,
    />Erste Zeile\.\n\n&lt;strong(?:&gt;|>)Zweite Zeile\.&lt;\/strong(?:&gt;|>)<\/p>/
  );
  assert.equal((await request(`/stellenanzeigen/${randomUUID()}`)).status, 404);
  assert.equal((await request('/stellenanzeigen/ungueltig')).status, 404);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rowCount } = await pool.query(
      "update stellenanzeige set status = 'closed' where id = $1 and title = $2",
      [link[1].split('/').pop(), title]
    );
    assert.equal(
      rowCount,
      1,
      'Die gerade veröffentlichte Stellenanzeige wurde geschlossen'
    );
  } finally {
    await pool.end();
  }

  const publicList = await request('/');
  assert.equal(publicList.status, 200);
  assert.ok(!(await publicList.text()).includes(title));
  assert.equal((await request(link[1])).status, 404);

  const privateList = await request('/recruiter', { cookie });
  assert.equal(privateList.status, 200);
  assert.ok(
    (await privateList.text()).includes(`${title}</strong> · Geschlossen`)
  );
});
