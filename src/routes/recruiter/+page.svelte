<script lang="ts">
  import { resolve } from '$app/paths';
  import StellenanzeigeForm from '#lib/StellenanzeigeForm.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<svelte:head>
  <title>Recruiter-Bereich | Mini-Jobboard</title>
</svelte:head>

<h1>Recruiter-Bereich</h1>
<p>Angemeldet als <strong>{data.email}</strong></p>
<form method="POST" action="?/abmelden">
  <button type="submit">Abmelden</button>
</form>

<h2>Meine Stellenanzeigen</h2>
{#if data.stellenanzeigen.length}
  <ul>
    {#each data.stellenanzeigen as anzeige (anzeige.id)}
      <li>
        <strong>{anzeige.title}</strong> · {anzeige.status === 'open'
          ? 'Offen'
          : 'Geschlossen'}
        <a
          href={resolve('/recruiter/stellenanzeigen/[id]', { id: anzeige.id })}
          aria-label={`Stellenanzeige „${anzeige.title}“ bearbeiten`}
          >Bearbeiten</a
        >
      </li>
    {/each}
  </ul>
{:else}
  <p>Du hast noch keine Stellenanzeigen.</p>
{/if}

<h2>Stellenanzeige veröffentlichen</h2>
<StellenanzeigeForm
  action="?/veroeffentlichen"
  submitLabel="Veröffentlichen"
  {form}
/>
