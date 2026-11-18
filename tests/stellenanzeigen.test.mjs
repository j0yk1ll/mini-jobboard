import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

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
    assert.ok(
      (await dashboard.text()).includes(`${title}</strong> · ${status}`)
    );

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
