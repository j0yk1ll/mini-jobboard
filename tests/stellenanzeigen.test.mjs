import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
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

async function publishStellenanzeige(cookie, title, description) {
  const published = await request('/recruiter?/veroeffentlichen', {
    cookie,
    form: { title, description }
  });
  assert.equal(published.status, 303);

  const list = await request('/');
  assert.equal(list.status, 200);
  const link = (await list.text()).match(
    new RegExp(`<a href="([^" ]*stellenanzeigen/[^"/]+)">${title}</a>`)
  );
  assert.ok(link, 'Öffentliche Liste verlinkt die Stellenanzeige');
  return new URL(link[1], origin).pathname;
}

function dashboardShowsListing(html, title, status) {
  return [...html.matchAll(/<li\b[^>]*>(.*?)<\/li>/gs)].some(
    ([, row]) =>
      new RegExp(`<strong\\b[^>]*>${title}</strong>`).test(row) &&
      new RegExp(`<span\\b[^>]*>${status}</span>`).test(row)
  );
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
  assert.ok(dashboardShowsListing(await ownPage.text(), title, 'Offen'));

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

test('Der zuständige Recruiter kann Titel und Beschreibung im eigenen Bereich ändern', async () => {
  const cookie = await registerRecruiter();
  const otherCookie = await registerRecruiter();
  const title = `Redaktion ${randomUUID()}`;
  const publicPath = await publishStellenanzeige(
    cookie,
    title,
    'Bisheriger Text'
  );
  const privatePath = `/recruiter${publicPath}`;
  const editPath = `${privatePath}?/bearbeiten`;
  const updatedTitle = `Lektorat ${randomUUID()}`.padEnd(120, 'z');
  const updatedDescription = 'Neuer Text.\nZweite Zeile.'.padEnd(5000, 'x');
  const form = {
    title: ` ${updatedTitle} `,
    description: ` \n${updatedDescription}\n `
  };

  const dashboard = await request('/recruiter', { cookie });
  const dashboardLinks = [
    ...(await dashboard.text()).matchAll(/href="([^"]+)"/g)
  ];
  assert.ok(
    dashboardLinks.some(
      ([, href]) =>
        new URL(href, `${origin}/recruiter`).pathname === privatePath
    )
  );

  const editor = await request(privatePath, { cookie });
  assert.equal(editor.status, 200);
  assert.equal(editor.headers.get('cache-control'), 'no-store');
  const editorHtml = await editor.text();
  assert.ok(editorHtml.includes(`value="${title}"`));
  assert.match(editorHtml, /Bisheriger Text<\/textarea>/);

  for (const path of [privatePath, editPath]) {
    const options = path === editPath ? { form } : {};
    const anonymous = await request(path, options);
    assert.equal(anonymous.status, 303);
    assert.equal(anonymous.headers.get('location'), '/anmelden');
    assert.equal(
      (await request(path, { ...options, cookie: otherCookie })).status,
      404
    );
  }

  for (const [fields, message] of [
    [{ ...form, title: '  ' }, /Gib einen Titel ein/],
    [{ ...form, description: '  ' }, /Gib eine Beschreibung ein/],
    [{ ...form, title: `${updatedTitle}z` }, /höchstens 120 Zeichen/],
    [
      { ...form, description: `${updatedDescription}x` },
      /höchstens 5000 Zeichen/
    ]
  ]) {
    const invalid = await request(editPath, { cookie, form: fields });
    assert.equal(invalid.status, 400);
    assert.match(await invalid.text(), message);
  }
  assert.ok((await (await request(publicPath)).text()).includes(title));

  const updated = await request(editPath, { cookie, form });
  assert.equal(updated.status, 303);
  assert.equal(updated.headers.get('location'), privatePath);
  assert.ok((await (await request('/')).text()).includes(updatedTitle));
  const publicHtml = await (await request(publicPath)).text();
  assert.ok(publicHtml.includes(`>${updatedTitle}</h1>`));
  assert.ok(publicHtml.includes(`>${updatedDescription}</p>`));
});

test('Besucher finden offene Stellenanzeigen und lesen Beschreibungen als Klartext', async () => {
  const cookie = await registerRecruiter();
  const title = `Redaktion ${randomUUID()}`;
  const publicPath = await publishStellenanzeige(
    cookie,
    title,
    '  Erste Zeile.\r\n\r\n<strong>Zweite Zeile.</strong>  '
  );

  const detail = await request(publicPath);
  assert.equal(detail.status, 200);
  const html = await detail.text();
  assert.match(html, new RegExp(`<h1\\b[^>]*>${title}</h1>`));
  assert.match(
    html,
    />Erste Zeile\.\n\n&lt;strong(?:&gt;|>)Zweite Zeile\.&lt;\/strong(?:&gt;|>)<\/p>/
  );
  assert.equal((await request(`/stellenanzeigen/${randomUUID()}`)).status, 404);
  assert.equal((await request('/stellenanzeigen/ungueltig')).status, 404);
});

test('Der zuständige Recruiter kann eine Stellenanzeige schließen und wieder öffnen', async () => {
  const cookie = await registerRecruiter();
  const otherCookie = await registerRecruiter();
  const title = `Vertrieb ${randomUUID()}`;
  const description = 'Ein Platz im Team ist frei.';
  const publicPath = await publishStellenanzeige(cookie, title, description);
  const privatePath = `/recruiter${publicPath}`;

  for (const [action, status, button, publicStatus] of [
    ['schliessen', 'Geschlossen', 'Wieder öffnen', 404],
    ['oeffnen', 'Offen', 'Schließen', 200]
  ]) {
    const actionPath = `${privatePath}?/${action}`;
    const anonymous = await request(actionPath, { form: {} });
    assert.equal(anonymous.status, 303);
    assert.equal(anonymous.headers.get('location'), '/anmelden');
    assert.equal(
      (await request(actionPath, { cookie: otherCookie, form: {} })).status,
      404
    );
    const before = await request(publicPath);
    assert.equal(before.status, action === 'schliessen' ? 200 : 404);

    const updated = await request(actionPath, { cookie, form: {} });
    assert.equal(updated.status, 303);
    assert.equal(updated.headers.get('location'), privatePath);

    const dashboard = await request('/recruiter', { cookie });
    assert.equal(dashboard.status, 200);
    assert.ok(dashboardShowsListing(await dashboard.text(), title, status));

    const editor = await request(privatePath, { cookie });
    assert.equal(editor.status, 200);
    const editorHtml = await editor.text();
    assert.ok(editorHtml.includes(`>${button}</button>`));
    assert.ok(editorHtml.includes(`${description}</textarea>`));

    const publicList = await request('/');
    assert.equal(publicList.status, 200);
    assert.equal(
      (await publicList.text()).includes(title),
      publicStatus === 200
    );
    const publicDetail = await request(publicPath);
    assert.equal(publicDetail.status, publicStatus);
    if (publicStatus === 200)
      assert.ok((await publicDetail.text()).includes(description));
  }
});

test('Bewerber können ohne Konto eine Bewerbung absenden', async () => {
  const cookie = await registerRecruiter();
  const publicPath = await publishStellenanzeige(
    cookie,
    `Entwicklung ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  const detail = await request(publicPath);
  assert.equal(detail.status, 200);
  assert.match(await detail.text(), /Bewerbung absenden/);

  const submitted = await request(`${publicPath}?/bewerben`, {
    form: {
      name: '  Ada Beispiel  ',
      email: '  ADA@example.com  ',
      text: '  Erste Zeile.\r\nZweite Zeile.  '
    }
  });
  const confirmation = await confirmBewerbung(submitted);
  assert.match(confirmation, /Deine Bewerbung liegt vor/);
  assert.deepEqual(await storedBewerbungen(publicPath), [
    {
      name: 'Ada Beispiel',
      email: 'ada@example.com',
      text: 'Erste Zeile.\nZweite Zeile.',
      status: 'neu'
    }
  ]);
});

async function confirmBewerbung(response) {
  assert.equal(response.status, 303);
  const confirmation = await request(response.headers.get('location'));
  assert.equal(confirmation.status, 200);
  return confirmation.text();
}

async function connectTestDb() {
  const { DATABASE_URL } = process.env;
  assert.ok(DATABASE_URL, 'DATABASE_URL muss auf die Testdatenbank zeigen');
  const db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();
  return db;
}

async function storedBewerbungen(publicPath) {
  const db = await connectTestDb();
  try {
    const { rows } = await db.query(
      'SELECT name, email, text, status FROM bewerbung WHERE stellenanzeige_id = $1',
      [publicPath.split('/').at(-1)]
    );
    return rows;
  } finally {
    await db.end();
  }
}

const validBewerbung = {
  name: 'Ada Beispiel',
  email: 'ada@example.com',
  text: 'Ich freue mich auf ein Gespräch.'
};

function submitBewerbung(publicPath, form = validBewerbung) {
  return request(`${publicPath}?/bewerben`, { form });
}

test('Recruiter sehen die Anzahl der Bewerbungen pro eigener Stellenanzeige und öffnen sie direkt', async () => {
  const cookie = await registerRecruiter();
  const otherCookie = await registerRecruiter();
  const title = `Produktdesign ${randomUUID()}`;
  const emptyTitle = `Projektassistenz ${randomUUID()}`;
  const publicPath = await publishStellenanzeige(cookie, title, 'Beschreibung');
  await publishStellenanzeige(cookie, emptyTitle, 'Beschreibung');
  const privatePath = `/recruiter${publicPath}`;

  await confirmBewerbung(await submitBewerbung(publicPath));
  const single = await request('/recruiter', { cookie });
  assert.match(await single.text(), />1 Bewerbung<\/a>/);

  await confirmBewerbung(
    await submitBewerbung(publicPath, {
      ...validBewerbung,
      email: 'zweite-bewerbung@example.com'
    })
  );
  assert.equal(
    (await request(`${privatePath}?/schliessen`, { cookie, form: {} })).status,
    303
  );

  const dashboard = await request('/recruiter', { cookie });
  assert.equal(dashboard.headers.get('cache-control'), 'no-store');
  const rows = [
    ...(await dashboard.text()).matchAll(/<li\b[^>]*>(.*?)<\/li>/gs)
  ].map(([, row]) => row);
  const listing = rows.find((row) => row.includes(title));
  assert.ok(listing);
  const applicationsLink = listing.match(
    /<a\b[^>]*href="([^"]+)"[^>]*>2 Bewerbungen<\/a>/
  );
  assert.ok(applicationsLink);
  const applicationsUrl = new URL(applicationsLink[1], origin);
  assert.equal(applicationsUrl.pathname, privatePath);
  assert.equal(applicationsUrl.hash, '#bewerbungen');
  const emptyListing = rows.find((row) => row.includes(emptyTitle));
  assert.ok(emptyListing);
  assert.match(emptyListing, /Keine Bewerbungen/);

  const applications = await request(applicationsUrl.pathname, { cookie });
  assert.equal(applications.status, 200);
  assert.match(await applications.text(), /id="bewerbungen"/);
  const otherDashboard = await request('/recruiter', { cookie: otherCookie });
  assert.doesNotMatch(await otherDashboard.text(), /2 Bewerbungen/);
  assert.equal(
    (await request(applicationsUrl.pathname, { cookie: otherCookie })).status,
    404
  );
});

test('Nur der zuständige Recruiter sieht Bewerbungen mit Klartext und initialem Status', async () => {
  const cookie = await registerRecruiter();
  const otherCookie = await registerRecruiter();
  const publicPath = await publishStellenanzeige(
    cookie,
    `Gestaltung ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  const privatePath = `/recruiter${publicPath}`;
  await confirmBewerbung(
    await submitBewerbung(publicPath, {
      ...validBewerbung,
      text: 'Erste Zeile.\r\n<br>Zweite Zeile.'
    })
  );

  const ownPage = await request(privatePath, { cookie });
  assert.equal(ownPage.status, 200);
  assert.equal(ownPage.headers.get('cache-control'), 'no-store');
  const html = await ownPage.text();
  assert.match(html, />Ada Beispiel<\/h3>/);
  assert.match(html, />ada@example\.com<\/p>/);
  assert.match(html, />Erste Zeile\.\n&lt;br(?:&gt;|>)Zweite Zeile\.<\/p>/);
  assert.match(html, />Bewerbungsstatus: neu<\/p>/);

  const otherPage = await request(privatePath, { cookie: otherCookie });
  assert.equal(otherPage.status, 404);
  assert.doesNotMatch(
    await otherPage.text(),
    /Ada Beispiel|ada@example\.com|Zweite Zeile/
  );

  const anonymous = await request(privatePath);
  assert.equal(anonymous.status, 303);
  assert.equal(anonymous.headers.get('location'), '/anmelden');
  assert.doesNotMatch(
    await (await request(publicPath)).text(),
    /Ada Beispiel|ada@example\.com|Zweite Zeile/
  );
});

test('Nur der zuständige Recruiter kann den Bewerbungsstatus ändern, auch bei geschlossenen Stellenanzeigen', async () => {
  const cookie = await registerRecruiter();
  const otherCookie = await registerRecruiter();
  const publicPath = await publishStellenanzeige(
    cookie,
    `Fertigung ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  const otherPublicPath = await publishStellenanzeige(
    otherCookie,
    `Verwaltung ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  const privatePath = `/recruiter${publicPath}`;
  await confirmBewerbung(await submitBewerbung(publicPath));

  const editor = await request(privatePath, { cookie });
  const statusForm = (await editor.text()).match(
    /<form\b[^>]*action="(\?\/bewerbungsstatus)"[^>]*>.*?name="bewerbungId" value="([^"]+)"/s
  );
  assert.ok(statusForm, 'Die Bewerbung hat ein Formular zum Ändern des Status');
  const [, action, bewerbungId] = statusForm;
  const actionPath = privatePath + action;
  const fields = { bewerbungId, status: 'eingeladen' };

  const anonymous = await request(actionPath, { form: fields });
  assert.equal(anonymous.status, 303);
  assert.equal(anonymous.headers.get('location'), '/anmelden');
  assert.equal(
    (await request(actionPath, { cookie: otherCookie, form: fields })).status,
    404
  );
  assert.equal(
    (
      await request(`/recruiter${otherPublicPath}${action}`, {
        cookie: otherCookie,
        form: fields
      })
    ).status,
    404
  );
  const invalid = await request(actionPath, {
    cookie,
    form: { ...fields, status: 'unbekannt' }
  });
  assert.equal(invalid.status, 400);
  assert.match(await invalid.text(), /Wähle einen gültigen Bewerbungsstatus/);
  const unchanged = await request(privatePath, { cookie });
  assert.match(await unchanged.text(), />Bewerbungsstatus: neu<\/p>/);

  for (const status of ['eingeladen', 'abgelehnt', 'neu']) {
    if (status === 'abgelehnt') {
      await changeStellenanzeigenStatus(publicPath, cookie, 'schliessen');
      assert.equal((await request(publicPath)).status, 404);
      const closed = await request(privatePath, { cookie });
      assert.equal(closed.status, 200);
      const closedHtml = await closed.text();
      assert.match(closedHtml, />Ada Beispiel<\/h3>/);
      assert.match(closedHtml, />Bewerbungsstatus: eingeladen<\/p>/);
    }
    const updated = await request(actionPath, {
      cookie,
      form: { bewerbungId, status }
    });
    assert.equal(updated.status, 303);
    assert.equal(updated.headers.get('location'), privatePath);
    const refreshed = await request(privatePath, { cookie });
    assert.match(
      await refreshed.text(),
      new RegExp(`>Bewerbungsstatus: ${status}</p>`)
    );
  }
});

test('Das öffentliche Formular meldet ungültige Bewerbungsfelder und prüft die Länge nach dem Trimmen', async () => {
  const cookie = await registerRecruiter();
  const publicPath = await publishStellenanzeige(
    cookie,
    `Validierung ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  for (const [field, value, message] of [
    ['name', '  ', /Gib deinen Namen ein/],
    ['email', '  ', /Gib deine E-Mail-Adresse ein/],
    ['email', 'a..b@example.com', /Gib eine gültige E-Mail-Adresse ein/],
    ['text', ' \n ', /Gib einen Bewerbungstext ein/],
    ['name', 'x'.repeat(101), /höchstens 100 Zeichen/],
    ['text', 'x'.repeat(1001), /höchstens 1000 Zeichen/],
    ['text', 'Text\0', /ungültiges Zeichen/]
  ]) {
    const response = await submitBewerbung(publicPath, {
      ...validBewerbung,
      [field]: value
    });
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), message);
  }
  assert.deepEqual(await storedBewerbungen(publicPath), []);

  const name = 'é'.repeat(100);
  const text = '🙂'.repeat(1000);
  const submitted = await submitBewerbung(publicPath, {
    ...validBewerbung,
    name: `  ${name}  `,
    text: ` \n${text}\n `
  });
  await confirmBewerbung(submitted);
  assert.deepEqual(await storedBewerbungen(publicPath), [
    { ...validBewerbung, name, text, status: 'neu' }
  ]);
});

test('Gleichzeitige und normalisierte Wiederholungen liefern dieselbe Bestätigung und lassen die erste Bewerbung bestehen', async () => {
  const cookie = await registerRecruiter();
  const firstPath = await publishStellenanzeige(
    cookie,
    `Beratung ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  const secondPath = await publishStellenanzeige(
    cookie,
    `Planung ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  const repeat = {
    name: 'Anderer Name',
    email: ' \tADA@Example.COM\u00a0',
    text: 'Anderer Text.'
  };

  const first = await confirmBewerbung(await submitBewerbung(firstPath));
  assert.equal(
    await confirmBewerbung(await submitBewerbung(firstPath, repeat)),
    first
  );
  assert.deepEqual(await storedBewerbungen(firstPath), [
    { ...validBewerbung, status: 'neu' }
  ]);

  const responses = await Promise.all([
    submitBewerbung(secondPath),
    submitBewerbung(secondPath, repeat)
  ]);
  for (const response of responses) {
    assert.equal(await confirmBewerbung(response), first);
  }
  const rows = await storedBewerbungen(secondPath);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    ...(rows[0].name === repeat.name ? repeat : validBewerbung),
    email: validBewerbung.email,
    status: 'neu'
  });
});

async function changeStellenanzeigenStatus(publicPath, cookie, action) {
  const response = await request(`/recruiter${publicPath}?/${action}`, {
    cookie,
    form: {}
  });
  assert.equal(response.status, 303);
}

async function assertGeschlossen(response) {
  assert.equal(response.status, 409);
  assert.match(await response.text(), /Diese Stellenanzeige ist geschlossen/);
}

test('Ein zuvor geöffnetes Bewerbungsformular weist Bewerbungen nach dem Schließen ab', async () => {
  const cookie = await registerRecruiter();
  const publicPath = await publishStellenanzeige(
    cookie,
    `Betrieb ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  assert.match(await (await request(publicPath)).text(), /Bewerbung absenden/);
  await changeStellenanzeigenStatus(publicPath, cookie, 'schliessen');
  await assertGeschlossen(await submitBewerbung(publicPath));
  assert.deepEqual(await storedBewerbungen(publicPath), []);

  const unknown = await submitBewerbung(`/stellenanzeigen/${randomUUID()}`);
  assert.equal(unknown.status, 404);
});

test('Bewerbungen bleiben nach dem Schließen und Wiederöffnen erhalten', async () => {
  const cookie = await registerRecruiter();
  const publicPath = await publishStellenanzeige(
    cookie,
    `Service ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  const submitted = await submitBewerbung(publicPath);
  await changeStellenanzeigenStatus(publicPath, cookie, 'schliessen');
  const first = await confirmBewerbung(submitted);
  await assertGeschlossen(await submitBewerbung(publicPath));
  assert.deepEqual(await storedBewerbungen(publicPath), [
    { ...validBewerbung, status: 'neu' }
  ]);

  await changeStellenanzeigenStatus(publicPath, cookie, 'oeffnen');
  const repeat = await submitBewerbung(publicPath, {
    name: 'Anderer Name',
    email: '  ADA@example.com ',
    text: 'Anderer Text.'
  });
  assert.equal(await confirmBewerbung(repeat), first);
  assert.deepEqual(await storedBewerbungen(publicPath), [
    { ...validBewerbung, status: 'neu' }
  ]);
});

test('Gleichzeitiges Schließen und Absenden lässt nur eine gespeicherte oder eine abgewiesene Bewerbung zu', async () => {
  const cookie = await registerRecruiter();
  const publicPath = await publishStellenanzeige(
    cookie,
    `Einkauf ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  const [response] = await Promise.all([
    submitBewerbung(publicPath),
    changeStellenanzeigenStatus(publicPath, cookie, 'schliessen')
  ]);

  assert.equal((await request(publicPath)).status, 404);
  if (response.status === 303) {
    assert.match(await confirmBewerbung(response), /Deine Bewerbung liegt vor/);
    assert.deepEqual(await storedBewerbungen(publicPath), [
      { ...validBewerbung, status: 'neu' }
    ]);
  } else {
    await assertGeschlossen(response);
    assert.deepEqual(await storedBewerbungen(publicPath), []);
  }
});

test('PostgreSQL weist nicht normalisierte E-Mail-Adressen und doppelte Bewerbungen ab', async () => {
  const cookie = await registerRecruiter();
  const publicPath = await publishStellenanzeige(
    cookie,
    `Forschung ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  await confirmBewerbung(await submitBewerbung(publicPath));

  const db = await connectTestDb();
  try {
    const insert = (email) =>
      db.query(
        'INSERT INTO bewerbung (stellenanzeige_id, name, email, text) VALUES ($1, $2, $3, $4)',
        [
          publicPath.split('/').at(-1),
          validBewerbung.name,
          email,
          validBewerbung.text
        ]
      );
    await assert.rejects(insert('ada@example.com'), { code: '23505' });
    for (const email of [' ADA@example.com ', '\tada@example.com\u00a0']) {
      await assert.rejects(insert(email), { code: '23514' });
    }
  } finally {
    await db.end();
  }
});

test('Eine Bewerbung wartet auf einen laufenden Schließvorgang und wird danach abgewiesen', async () => {
  const cookie = await registerRecruiter();
  const publicPath = await publishStellenanzeige(
    cookie,
    `Produktion ${randomUUID()}`,
    'Wir suchen Verstärkung.'
  );
  const closing = await connectTestDb();
  const observer = await connectTestDb();
  try {
    await closing.query('BEGIN');
    await closing.query(
      "UPDATE stellenanzeige SET status = 'closed' WHERE id = $1",
      [publicPath.split('/').at(-1)]
    );
    const [{ pid }] = (await closing.query('SELECT pg_backend_pid() AS pid'))
      .rows;
    const submission = submitBewerbung(publicPath);

    // Wait until PostgreSQL confirms that the HTTP request is behind the close.
    const deadline = Date.now() + 3000;
    while (true) {
      const [{ waiting }] = (
        await observer.query(
          'SELECT EXISTS (SELECT FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))) AS waiting',
          [pid]
        )
      ).rows;
      if (waiting) break;
      assert.ok(
        Date.now() < deadline,
        'Die Bewerbung wartet auf die Zeilensperre'
      );
      await delay(20);
    }

    await closing.query('COMMIT');
    await assertGeschlossen(await submission);
    assert.deepEqual(await storedBewerbungen(publicPath), []);
  } finally {
    await Promise.all([closing.end(), observer.end()]);
  }
});
