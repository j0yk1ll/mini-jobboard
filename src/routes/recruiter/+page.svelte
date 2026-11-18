<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Recruiter-Bereich | Mini-Jobboard</title>
</svelte:head>

<h1>Recruiter-Bereich</h1>
<p>Angemeldet als <strong>{data.email}</strong></p>
<form method="POST" action="?/abmelden">
  <button type="submit">Abmelden</button>
</form>
