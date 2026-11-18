import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test('Die Compose-Demo richtet Beispieldaten einmalig ein', async (t) => {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const project = `mini-jobboard-demo-${randomUUID()}`;
  const env = {
    ...process.env,
    APP_PORT: String(port),
    ORIGIN: origin,
    SEED_DEMO: ''
  };
  const compose = (...args) =>
    execFileSync('docker', ['compose', '--project-name', project, ...args], {
      env,
      stdio: 'inherit',
      timeout: 300_000
    });

  function request(path, { cookie, form } = {}) {
    return fetch(new URL(path, origin), {
      headers: {
        accept: 'text/html',
        ...(cookie && { cookie }),
        ...(form && { origin })
      },
      method: form ? 'POST' : 'GET',
      body: form && new URLSearchParams(form),
      redirect: 'manual',
      signal: globalThis.AbortSignal.timeout(3_000)
    });
  }

  async function waitForApp() {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const response = await request('/').catch(() => undefined);
      if (response?.ok) return response.text();
      await delay(500);
    }
    compose('logs', 'app', 'db');
    assert.fail('Die Demo ist nicht erreichbar');
  }

  const closedTitle = 'Projektassistenz Nord';
  const nord = {
    email: 'recruiter-nord@example.test',
    title: 'Softwareentwicklung Nord',
    applicant: 'Alex Winter',
    ownsClosedStellenanzeige: true
  };
  const sued = {
    email: 'recruiter-sued@example.test',
    title: 'Produktdesign Süd',
    applicant: 'Robin Sommer',
    ownsClosedStellenanzeige: false
  };

  async function verifyRecruiter(
    list,
    recruiter,
    otherTitle,
    applicationStatus
  ) {
    const { email, title, applicant, ownsClosedStellenanzeige } = recruiter;
    const links = [
      ...list.matchAll(new RegExp(`<a href="([^"]+)">${title}</a>`, 'g'))
    ];
    assert.equal(links.length, 1, title);
    const publicPath = new URL(links[0][1], origin).pathname;
    assert.equal((await request(publicPath)).status, 200);

    const signIn = await request('/anmelden', {
      form: { email, password: 'Jobboard-Demo-2026' }
    });
    assert.equal(signIn.status, 303, `Anmeldung für ${email}`);
    assert.equal(signIn.headers.get('location'), '/recruiter');
    const session = signIn.headers
      .getSetCookie()
      .find((value) => value.includes('.session_token='));
    assert.ok(session, email);
    const cookie = session.split(';', 1)[0];

    const dashboard = await request('/recruiter', { cookie });
    assert.equal(dashboard.status, 200);
    const dashboardHtml = await dashboard.text();
    const rows = [...dashboardHtml.matchAll(/<li\b[^>]*>(.*?)<\/li>/gs)].map(
      ([, row]) => row
    );
    assert.equal(
      rows.filter(
        (row) =>
          new RegExp(`<strong\\b[^>]*>${title}</strong>`).test(row) &&
          /<span\b[^>]*>Offen<\/span>/.test(row)
      ).length,
      1
    );
    assert.equal(
      rows.filter(
        (row) =>
          new RegExp(`<strong\\b[^>]*>${closedTitle}</strong>`).test(row) &&
          /<span\b[^>]*>Geschlossen<\/span>/.test(row)
      ).length,
      ownsClosedStellenanzeige ? 1 : 0
    );
    assert.ok(!dashboardHtml.includes(otherTitle));

    const path = `/recruiter${publicPath}`;
    const editor = await request(path, { cookie });
    assert.equal(editor.status, 200);
    const editorHtml = await editor.text();
    assert.equal(
      [...editorHtml.matchAll(new RegExp(`<h3\\b[^>]*>${applicant}</h3>`, 'g'))]
        .length,
      1
    );
    assert.ok(editorHtml.includes(`Bewerbungsstatus: ${applicationStatus}`));
    const applications = [
      ...editorHtml.matchAll(/name="bewerbungId" value="([^"]+)"/g)
    ];
    assert.equal(applications.length, 1);
    return { path, cookie, applicationId: applications[0][1] };
  }

  async function verifyDemo(nordApplicationStatus) {
    const list = await waitForApp();
    assert.ok(!list.includes(closedTitle));
    const nordEditor = await verifyRecruiter(
      list,
      nord,
      sued.title,
      nordApplicationStatus
    );
    const suedEditor = await verifyRecruiter(list, sued, nord.title, 'neu');
    assert.equal(
      (await request(nordEditor.path, { cookie: suedEditor.cookie })).status,
      404
    );
    assert.equal(
      (await request(suedEditor.path, { cookie: nordEditor.cookie })).status,
      404
    );
    return nordEditor;
  }

  t.after(() => compose('down', '--volumes'));
  compose('up', '--build', '-d');
  const { path, cookie, applicationId } = await verifyDemo('neu');
  const update = await request(`${path}?/bewerbungsstatus`, {
    cookie,
    form: { bewerbungId: applicationId, status: 'eingeladen' }
  });
  assert.equal(update.status, 303);

  compose('down');
  compose('up', '-d');
  const restarted = await verifyDemo('eingeladen');
  assert.equal(restarted.path, path);
  assert.equal(restarted.applicationId, applicationId);
});
