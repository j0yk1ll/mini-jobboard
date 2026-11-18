<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Offene Stellenanzeigen | Mini-Jobboard</title>
</svelte:head>

<div class="hero">
  <div class="content-width hero-content">
    <h1 id="offene-stellenanzeigen">Offene Stellenanzeigen</h1>
  </div>
</div>

<section class="content-width results" aria-labelledby="offene-stellenanzeigen">
  {#if data.stellenanzeigen.length}
    <ul role="list">
      {#each data.stellenanzeigen as anzeige (anzeige.id)}
        <li>
          <a href={resolve('/stellenanzeigen/[id]', { id: anzeige.id })}
            >{anzeige.title}</a
          >
        </li>
      {/each}
    </ul>
  {:else}
    <p class="panel empty-state">
      Zurzeit gibt es keine offenen Stellenanzeigen.
    </p>
  {/if}
</section>

<style>
  .hero {
    overflow: hidden;
    border-bottom: 1px solid var(--line);
    background: #eef3fc;
  }

  .hero-content {
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    min-height: clamp(9rem, 22vw, 15rem);
    padding-block: clamp(2.25rem, 7vw, 4.5rem);
  }

  .hero-content::after {
    position: absolute;
    z-index: -1;
    inset: 0 -1rem 0 auto;
    width: min(48%, 34rem);
    background: repeating-linear-gradient(
      135deg,
      #dce6fa 0 1px,
      transparent 1px 12px
    );
    content: '';
    mask-image: linear-gradient(to right, transparent, #000);
  }

  h1 {
    font-size: clamp(2.125rem, 5.5vw, 4rem);
    letter-spacing: -0.05em;
  }

  .results {
    padding-block: 1.75rem 4rem;
  }

  ul {
    display: grid;
    gap: 0.75rem;
    max-width: 55rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li :global(a) {
    display: flex;
    align-items: center;
    gap: clamp(0.75rem, 2.5vw, 1.25rem);
    min-height: 4.75rem;
    padding: 0.875rem clamp(0.875rem, 3vw, 1.5rem);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink);
    font-size: clamp(1rem, 2.2vw, 1.125rem);
    font-weight: 650;
    text-decoration: none;
  }

  li :global(a)::before {
    flex: 0 0 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    background:
      linear-gradient(var(--accent), var(--accent)) center 0.8125rem / 1rem 2px
        no-repeat,
      linear-gradient(var(--accent), var(--accent)) center 1.1875rem / 1rem 2px
        no-repeat,
      linear-gradient(var(--accent), var(--accent)) 0.75rem 1.5625rem / 0.625rem
        2px no-repeat,
      var(--accent-soft);
    content: '';
  }

  li :global(a)::after {
    flex: 0 0 0.5rem;
    height: 0.5rem;
    margin-inline: auto 0.25rem;
    border: solid var(--accent);
    border-width: 2px 2px 0 0;
    content: '';
    rotate: 45deg;
  }

  li :global(a):hover {
    border-color: var(--accent);
    color: var(--accent-strong);
  }
</style>
