<script lang="ts">
  import { resolve } from '$app/paths';
  import StellenanzeigeForm from '#lib/StellenanzeigeForm.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<svelte:head>
  <title>Stellenanzeige bearbeiten | Mini-Jobboard</title>
</svelte:head>

<p><a href={resolve('/recruiter')}>Meine Stellenanzeigen</a></p>
<h1>Stellenanzeige bearbeiten</h1>
<p>Status: {data.anzeige.status === 'open' ? 'Offen' : 'Geschlossen'}</p>

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
  <button type="submit"
    >{data.anzeige.status === 'open' ? 'Schließen' : 'Wieder öffnen'}</button
  >
</form>

<style>
  .visibility {
    margin-top: 1.5rem;
  }
</style>
