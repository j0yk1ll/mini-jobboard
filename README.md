# Mini-Jobboard

## Lokal starten

```sh
docker compose up --build
```

Öffne [http://localhost:3000](http://localhost:3000) und registriere ein Recruiter-Konto mit einer E-Mail-Adresse und einem Passwort mit mindestens acht Zeichen. Nach der Registrierung bist du direkt angemeldet.

Die Anwendung startet, sobald PostgreSQL erreichbar ist und die eingecheckten Migrationen angewendet sind. Die Daten bleiben nach `docker compose down` im lokalen Volume erhalten. Die Compose-Standardwerte sind für den lokalen Betrieb vorgesehen. Mit `APP_PORT=3001 ORIGIN=http://localhost:3001 docker compose up --build` kannst du den Port ändern.

## Entwicklung

Mit Node.js 24 und einer laufenden PostgreSQL-Datenbank:

```sh
npm ci
export DATABASE_URL=postgresql://USER:PASSWORT@localhost:5432/DATENBANK
export ORIGIN=http://localhost:3000
export BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
npm run db:migrate
npm run dev -- --port 3000 --strictPort
```

In einem zweiten Terminal laufen die HTTP-Integrationstests mit `npm test` gegen die Anwendung. Für einen anderen Port setze `TEST_ORIGIN` auf die entsprechende Adresse. Mit `npm run db:generate -- --name beschreibung` werden Schemaänderungen als Migration erzeugt. `npm run check` prüft Typen und Svelte-Diagnosen. `npm run lint` prüft den Quellcode und seine Formatierung.

## Datenmodell und Entscheidungen

Better Auth verwaltet Recruiter-Konten (`user`), Passwort-Hashes (`account`), Sitzungen (`session`) und Verifikationsdaten (`verification`). Der Server prüft die Sitzung vor dem Zugriff auf den Recruiter-Bereich. Die lokale Registrierung erfordert keine E-Mail-Bestätigung.

Stellenanzeigen, Bewerbungen und Demo-Konten folgen in weiteren Tickets.
