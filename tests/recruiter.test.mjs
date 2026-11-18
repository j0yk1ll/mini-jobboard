import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const origin = process.env.TEST_ORIGIN ?? 'http://localhost:3000';

function request(path, { form, cookie, formOrigin = origin } = {}) {
  return fetch(new URL(path, origin), {
    method: form ? 'POST' : 'GET',
    headers: {
      accept: 'text/html',
      ...(form && { origin: formOrigin }),
      ...(cookie && { cookie })
    },
    body: form && new URLSearchParams(form),
    redirect: 'manual'
  });
}

function redirectsTo(response, path) {
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), path);
}

function sessionCookie(response) {
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.includes('.session_token='));
  assert.ok(cookie, 'Better Auth sets a session cookie');
  assert.match(cookie, /;\s*HttpOnly/i);
  return cookie.split(';', 1)[0];
}

test('Recruiter registrieren sich und erhalten direkt Zugang', async () => {
  redirectsTo(await request('/recruiter'), '/anmelden');
  const email = `recruiter-${randomUUID()}@example.com`;

  const registration = await request('/registrieren', {
    form: { email, password: '12345678', passwordConfirmation: '12345678' }
  });
  redirectsTo(registration, '/recruiter');

  const page = await request('/recruiter', {
    cookie: sessionCookie(registration)
  });
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes(email));
  assert.match(page.headers.get('cache-control'), /no-store/);
});

test('Registrierung erfordert eine übereinstimmende Passwortbestätigung', async () => {
  const email = `recruiter-${randomUUID()}@example.com`;
  const password = 'test-password-123';

  for (const [confirmation, message] of [
    [{}, /Bestätige dein Passwort/],
    [
      { passwordConfirmation: 'other-password-123' },
      /Passwörter stimmen nicht überein/
    ]
  ]) {
    const response = await request('/registrieren', {
      form: { email, password, ...confirmation }
    });
    assert.equal(response.status, 400);
    assert.match(await response.text(), message);
    assert.equal(response.headers.getSetCookie().length, 0);
  }

  const corrected = await request('/registrieren', {
    form: { email, password, passwordConfirmation: password }
  });
  redirectsTo(corrected, '/recruiter');
});

test('Recruiter melden sich an und beenden ihre Sitzung bei der Abmeldung', async () => {
  const email = `recruiter-${randomUUID()}@example.com`;
  const password = 'test-password-123';
  const registration = await request('/registrieren', {
    form: { email, password, passwordConfirmation: password }
  });
  redirectsTo(registration, '/recruiter');

  const invalid = await request('/anmelden', {
    form: { email, password: 'wrong-password' }
  });
  assert.equal(invalid.status, 400);
  assert.match(
    await invalid.text(),
    /E-Mail-Adresse oder Passwort ist ungültig/
  );
  assert.equal(invalid.headers.getSetCookie().length, 0);

  const signIn = await request('/anmelden', { form: { email, password } });
  redirectsTo(signIn, '/recruiter');
  const cookie = sessionCookie(signIn);
  assert.equal((await request('/recruiter', { cookie })).status, 200);

  const crossOrigin = await request('/recruiter?/abmelden', {
    cookie,
    form: {},
    formOrigin: 'https://example.com'
  });
  assert.equal(crossOrigin.status, 403);
  assert.equal((await request('/recruiter', { cookie })).status, 200);

  const signOut = await request('/recruiter?/abmelden', { cookie, form: {} });
  redirectsTo(signOut, '/anmelden');
  assert.ok(
    signOut.headers
      .getSetCookie()
      .some(
        (value) =>
          value.includes('.session_token=;') && /;\s*Max-Age=0/i.test(value)
      )
  );
  redirectsTo(await request('/recruiter', { cookie }), '/anmelden');
});

test('Registrierung prüft E-Mail-Adresse und Passwort auf dem Server', async () => {
  for (const [email, password, message] of [
    ['recruiter', '12345678', /gültige E-Mail-Adresse/],
    [`recruiter-${randomUUID()}@example.com`, '1234567', /mindestens 8 Zeichen/]
  ]) {
    const response = await request('/registrieren', {
      form: { email, password, passwordConfirmation: password }
    });
    assert.equal(response.status, 400);
    assert.match(await response.text(), message);
    assert.equal(response.headers.getSetCookie().length, 0);
  }
});
