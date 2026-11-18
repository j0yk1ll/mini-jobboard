<script lang="ts">
  import { resolve } from '$app/paths';
  import StellenanzeigeForm from '#lib/StellenanzeigeForm.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<svelte:head>
  <title>Recruiter-Bereich | Mini-Jobboard</title>
</svelte:head>

<div class="content-width page">
  <div class="page-heading dashboard-heading">
    <div>
      <h1>Recruiter-Bereich</h1>
      <p>Angemeldet als <strong>{data.email}</strong></p>
    </div>
    <form method="POST" action="?/abmelden">
      <button class="button-secondary" type="submit">Abmelden</button>
    </form>
  </div>

  <div class="two-column">
    <section class="panel" aria-labelledby="meine-stellenanzeigen">
      <h2 id="meine-stellenanzeigen">Meine Stellenanzeigen</h2>
      {#if data.stellenanzeigen.length}
        <ul role="list">
          {#each data.stellenanzeigen as anzeige (anzeige.id)}
            {@const detailPath = resolve('/recruiter/stellenanzeigen/[id]', {
              id: anzeige.id
            })}
            {@const bewerbungen =
              anzeige.bewerbungsanzahl === 1
                ? '1 Bewerbung'
                : `${anzeige.bewerbungsanzahl} Bewerbungen`}
            <li>
              <div>
                <strong>{anzeige.title}</strong>
                <div class="listing-meta">
                  <span
                    class="listing-status"
                    class:open={anzeige.status === 'open'}
                    >{anzeige.status === 'open' ? 'Offen' : 'Geschlossen'}</span
                  >
                  {#if anzeige.bewerbungsanzahl}
                    <a
                      class="applications-link"
                      href={resolve(
                        '/recruiter/stellenanzeigen/[id]#bewerbungen',
                        { id: anzeige.id }
                      )}
                      aria-label={`${bewerbungen} für „${anzeige.title}“ anzeigen`}
                      >{bewerbungen}</a
                    >
                  {:else}
                    <span class="no-applications">Keine Bewerbungen</span>
                  {/if}
                </div>
              </div>
              <a
                href={detailPath}
                aria-label={`Stellenanzeige „${anzeige.title}“ bearbeiten`}
                >Bearbeiten</a
              >
            </li>
          {/each}
        </ul>
      {:else}
        <p class="empty-state">Du hast noch keine Stellenanzeigen.</p>
      {/if}
    </section>

    <section class="panel" aria-labelledby="veroeffentlichen">
      <h2 id="veroeffentlichen">Stellenanzeige veröffentlichen</h2>
      <StellenanzeigeForm
        action="?/veroeffentlichen"
        submitLabel="Veröffentlichen"
        {form}
      />
    </section>
  </div>
</div>

<style>
  .dashboard-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem 1rem;
    padding-block: 0.75rem;
    border-top: 1px solid var(--line);
  }

  li:last-child {
    padding-bottom: 0;
  }

  li strong {
    display: block;
  }

  li a {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    font-size: 0.9375rem;
    font-weight: 650;
  }

  .listing-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.75rem;
    margin-top: 0.375rem;
  }

  .applications-link {
    border-radius: 0.5rem;
    padding-inline: 0.625rem;
    background: var(--accent-soft);
  }

  .applications-link:hover {
    background: #dce6ff;
  }

  .no-applications {
    color: var(--muted);
    font-size: 0.875rem;
  }

  .listing-status {
    padding: 0.125rem 0.625rem;
    border-radius: 1rem;
    background: var(--background);
    color: var(--muted);
    font-size: 0.8125rem;
    font-weight: 650;
  }

  .listing-status.open {
    background: #eaf7ef;
    color: #205a39;
  }
</style>
