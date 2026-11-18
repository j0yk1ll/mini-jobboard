<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.anzeige.title} | Mini-Jobboard</title>
</svelte:head>

<p><a href={resolve('/')}>Alle offenen Stellenanzeigen</a></p>
<h1>{data.anzeige.title}</h1>
<p class="description">{data.anzeige.description}</p>

<style>
  .description {
    white-space: pre-wrap;
  }
</style>
