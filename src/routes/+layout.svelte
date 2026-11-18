<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<header>
  <a href={resolve('/')}>Mini-Jobboard</a>
</header>
<main>
  {@render children()}
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f6f7f2;
    color: #172923;
    font:
      1rem/1.5 system-ui,
      sans-serif;
  }

  :global(:focus-visible) {
    outline: 3px solid #006565;
    outline-offset: 3px;
  }

  :global(a) {
    color: #005b4e;
    text-underline-offset: 0.2em;
  }

  header {
    padding: 1rem max(1rem, calc((100% - 64rem) / 2));
    border-bottom: 1px solid #c4cec7;
    background: #fff;
  }

  header a {
    font-weight: 700;
  }

  main {
    box-sizing: border-box;
    width: min(calc(100% - 2rem), 32rem);
    margin: clamp(2rem, 8vw, 5rem) auto;
    padding: clamp(1rem, 5vw, 2.5rem);
    border: 1px solid #c4cec7;
    border-radius: 0.75rem;
    background: #fff;
    overflow-wrap: anywhere;
  }

  :global(h1) {
    margin: 0 0 1.5rem;
    font-size: clamp(1.65rem, 6vw, 2.25rem);
    line-height: 1.15;
  }

  :global(button) {
    padding: 0.65rem 1rem;
    border: 1px solid #005b4e;
    border-radius: 0.375rem;
    background: #005b4e;
    color: #fff;
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }
</style>
