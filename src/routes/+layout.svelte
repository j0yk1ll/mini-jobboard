<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Snippet } from 'svelte';
  import '#lib/app.css';

  let { children }: { children: Snippet } = $props();
</script>

<header>
  <nav class="content-width" aria-label="Hauptnavigation">
    <a class="brand" href={resolve('/')}>
      <span class="brand-mark" aria-hidden="true"></span>
      Mini-Jobboard
    </a>
    <a class="recruiter-link" href={resolve('/recruiter')}>
      Recruiter-Bereich <span aria-hidden="true">↗</span>
    </a>
  </nav>
</header>

<main>
  {@render children()}
</main>

<style>
  header {
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0 1rem;
    min-height: 4.25rem;
    padding-block: 0.375rem;
  }

  nav a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    color: var(--ink);
    font-weight: 700;
    text-decoration: none;
  }

  nav a:hover {
    color: var(--accent);
  }

  .brand-mark {
    display: grid;
    width: 1.875rem;
    height: 1.875rem;
    place-items: center;
    border-radius: 0.5rem;
    background: var(--accent);
  }

  .brand-mark::before {
    width: 0.6875rem;
    height: 0.6875rem;
    border: solid #fff;
    border-width: 0 0.125rem 0.125rem 0;
    box-shadow: 0.1875rem 0.1875rem 0 #8aabff;
    content: '';
    rotate: -45deg;
  }

  .recruiter-link {
    font-size: 0.875rem;
  }
</style>
