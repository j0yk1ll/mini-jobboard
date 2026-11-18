<script lang="ts">
  import { resolve } from '$app/paths';
  import { BEWERBUNGSSTATUS } from '#lib/bewerbung.ts';
  import '#lib/form.css';
  import StellenanzeigeForm from '#lib/StellenanzeigeForm.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<svelte:head>
  <title>Stellenanzeige bearbeiten | Mini-Jobboard</title>
</svelte:head>

<div class="content-width page">
  <div class="page-heading">
    <a class="back-link" href={resolve('/recruiter')}>
      <span aria-hidden="true">←</span> Meine Stellenanzeigen
    </a>
    <h1>Stellenanzeige bearbeiten</h1>
    <p>Status: {data.anzeige.status === 'open' ? 'Offen' : 'Geschlossen'}</p>
  </div>

  <div class="two-column">
    <div class="panel">
      <StellenanzeigeForm
        action="?/bearbeiten"
        submitLabel="Änderungen speichern"
        anzeige={data.anzeige}
        {form}
      />

      <form
        class="visibility"
        method="POST"
        action={data.anzeige.status === 'open' ? '?/schliessen' : '?/oeffnen'}
      >
        <button class="button-secondary" type="submit"
          >{data.anzeige.status === 'open'
            ? 'Schließen'
            : 'Wieder öffnen'}</button
        >
      </form>
    </div>

    <section class="panel" aria-labelledby="bewerbungen">
      <h2 id="bewerbungen" tabindex="-1">Bewerbungen</h2>
      {#each data.bewerbungen as bewerbung (bewerbung.id)}
        {@const statusError =
          form?.bewerbungId === bewerbung.id ? form.statusError : undefined}
        <article>
          <h3>{bewerbung.name}</h3>
          <p>{bewerbung.email}</p>
          <p class="bewerbungstext">{bewerbung.text}</p>
          <p>Bewerbungsstatus: {bewerbung.status}</p>
          <form class="form-fields" method="POST" action="?/bewerbungsstatus">
            <input type="hidden" name="bewerbungId" value={bewerbung.id} />
            <div>
              <label for="status-{bewerbung.id}"
                >Neuer Bewerbungsstatus für {bewerbung.name}</label
              >
              <select
                id="status-{bewerbung.id}"
                name="status"
                value={bewerbung.status}
                aria-invalid={statusError ? true : undefined}
                aria-describedby={statusError
                  ? `statusfehler-${bewerbung.id}`
                  : undefined}
              >
                {#each BEWERBUNGSSTATUS as status (status)}
                  <option value={status}>{status}</option>
                {/each}
              </select>
              {#if statusError}
                <p id="statusfehler-{bewerbung.id}" class="error" role="alert">
                  {statusError}
                </p>
              {/if}
            </div>
            <button type="submit">Bewerbungsstatus speichern</button>
          </form>
        </article>
      {:else}
        <p class="empty-state">
          Für diese Stellenanzeige liegen noch keine Bewerbungen vor.
        </p>
      {/each}
    </section>
  </div>
</div>

<style>
  #bewerbungen {
    scroll-margin-top: 1rem;
  }

  .visibility {
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--line);
  }

  article {
    padding-block: 1.25rem;
    border-top: 1px solid var(--line);
  }

  article:last-child {
    padding-bottom: 0;
  }

  article h3 + p {
    margin-top: 0.25rem;
    color: var(--muted);
  }

  .bewerbungstext {
    white-space: pre-wrap;
  }
</style>
