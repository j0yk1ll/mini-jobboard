<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Offene Stellenanzeigen | Mini-Jobboard</title>
</svelte:head>

<h1>Offene Stellenanzeigen</h1>
{#if data.stellenanzeigen.length}
  <ul>
    {#each data.stellenanzeigen as anzeige (anzeige.id)}
      <li>
        <a href={resolve('/stellenanzeigen/[id]', { id: anzeige.id })}
          >{anzeige.title}</a
        >
      </li>
    {/each}
  </ul>
{:else}
  <p>Zurzeit gibt es keine offenen Stellenanzeigen.</p>
{/if}
<p><a href={resolve('/recruiter')}>Zum Recruiter-Bereich</a></p>
