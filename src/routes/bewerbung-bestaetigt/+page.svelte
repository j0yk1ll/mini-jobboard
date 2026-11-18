<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>Deine Bewerbung liegt vor | Mini-Jobboard</title>
</svelte:head>

<div class="page focused-page">
  <div class="panel confirmation">
    <span class="confirmation-mark" aria-hidden="true">✓</span>
    <h1>Deine Bewerbung liegt vor</h1>
    <a class="button" href={resolve('/')}>Alle offenen Stellenanzeigen</a>
  </div>
</div>

<style>
  .confirmation {
    text-align: center;
  }

  .confirmation-mark {
    display: grid;
    width: 3rem;
    height: 3rem;
    margin: 0 auto 1rem;
    place-items: center;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 1.5rem;
    font-weight: 700;
  }
</style>
