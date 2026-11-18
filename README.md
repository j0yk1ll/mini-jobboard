# Mini-Jobboard

## Lokal starten

```sh
docker compose up --build
```

Voraussetzung sind Docker und Docker Compose. Öffne die Liste der offenen Stellenanzeigen unter [http://localhost:3000](http://localhost:3000). Compose wendet die Migrationen an und legt die Beispieldaten an, bevor der Webserver startet.

| Recruiter                     | Passwort             | Stellenanzeigen                                                       |
| ----------------------------- | -------------------- | --------------------------------------------------------------------- |
| `recruiter-nord@example.test` | `Jobboard-Demo-2026` | Softwareentwicklung Nord (offen), Projektassistenz Nord (geschlossen) |
| `recruiter-sued@example.test` | `Jobboard-Demo-2026` | Produktdesign Süd (offen)                                             |

1. Öffne als Bewerber eine der beiden öffentlichen Stellenanzeigen und sende mit einer eigenen Testadresse eine Bewerbung ab. Die geschlossene Stelle fehlt in der öffentlichen Liste.
2. Melde dich über „Zum Recruiter-Bereich“ als Recruiter Nord an. Unter „Meine Stellenanzeigen“ findest du beide Stellen des Kontos. Öffne „Softwareentwicklung Nord“ über „Bearbeiten“ und ändere den Status der Beispielbewerbung von Alex Winter.
3. Melde dich ab und als Recruiter Süd an. Dieses Konto sieht „Produktdesign Süd“ und die Beispielbewerbung von Robin Sommer.

`docker compose down` behält das PostgreSQL-Volume. Beim nächsten Start bleiben vorhandene Konten, Stellenanzeigen und Bewerbungen samt Änderungen erhalten. Falls eine Demo-E-Mail-Adresse bereits an ein anderes Konto vergeben ist, bleibt dieses erhalten. Die Anwendung meldet beim Start, welches Demo-Konto sie überspringt. Ein frisches Volume enthält beide Demo-Konten.

Compose bindet die Demo an die lokale Loopback-Adresse. Mit `APP_PORT=3001 ORIGIN=http://localhost:3001 docker compose up --build` kannst du den Port ändern. Für einen lokalen Start mit einem leeren Volume ohne Beispieldaten setze `SEED_DEMO=0`.

## Lokaler Starttest

Mit Node.js 24 und laufendem Docker kannst du den Starttest aus dem Projektverzeichnis ausführen:

```sh
node --test tests/demo-start.mjs
```

Der Test baut das Image in einem eigenen Compose-Projekt, prüft beide Anmeldungen und Ansichten und startet die Anwendung mit demselben Volume neu. Er prüft, dass der geänderte Bewerbungsstatus erhalten bleibt und die Beispieldaten jeweils nur einmal erscheinen. Anschließend entfernt er das Test-Volume.

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

Starte für die HTTP-Integrationstests die Produktionsversion mit `npm run build && npm start` anstelle des Entwicklungsservers. Führe dann `npm test` in einem zweiten Terminal mit derselben Testdatenbank in `DATABASE_URL` aus. Für einen anderen Port setze `TEST_ORIGIN` auf die entsprechende Adresse. Mit `npm run db:generate -- --name beschreibung` werden Schemaänderungen als Migration erzeugt. `npm run check` prüft Typen und Svelte-Diagnosen. `npm run lint` prüft den Quellcode und seine Formatierung.

## Datenmodell und Entscheidungen

Better Auth verwaltet Recruiter-Konten (`user`), Passwort-Hashes (`account`), Sitzungen (`session`) und Verifikationsdaten (`verification`). Der Server prüft die Sitzung vor dem Zugriff auf den Recruiter-Bereich. Die lokale Registrierung erfordert keine E-Mail-Bestätigung.

Jede Stellenanzeige (`stellenanzeige`) gehört zu einem Recruiter und startet offen. Über „Meine Stellenanzeigen“ kann der zuständige Recruiter sie bearbeiten, schließen und wieder öffnen. Die private Übersicht zeigt beide Zustände. Die öffentliche Liste und die Detailseiten zeigen offene Stellenanzeigen.

Bewerber können auf der Detailseite ohne Konto eine Bewerbung (`bewerbung`) absenden. PostgreSQL speichert je Stellenanzeige und normalisierter E-Mail-Adresse die erste Bewerbung mit dem Status „neu“. Erst- und Wiederholungsbewerbungen auf eine offene Anzeige erhalten dieselbe Bestätigung. Auf der Bearbeitungsseite einer eigenen Stellenanzeige können Recruiter Bewerbungen lesen und ihren Status auf „neu“, „eingeladen“ oder „abgelehnt“ setzen. Das gilt auch für geschlossene Stellenanzeigen.

## Offene Punkte

E-Mail-Versand, E-Mail-Bestätigung, Passwort-Reset und Kontolöschung liegen außerhalb des aktuellen Funktionsumfangs. Ein öffentliches Deployment ist optional.
