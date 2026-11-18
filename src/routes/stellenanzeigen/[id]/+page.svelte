<script lang="ts">
  import { resolve } from '$app/paths';
  import '#lib/form.css';
  import {
    MAX_BEWERBUNGSTEXT_LENGTH,
    MAX_NAME_LENGTH
  } from '#lib/bewerbung.ts';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.anzeige.title} | Mini-Jobboard</title>
</svelte:head>

<div class="content-width page">
  <div class="page-heading">
    <a class="back-link" href={resolve('/')}>
      <span aria-hidden="true">←</span> Alle offenen Stellenanzeigen
    </a>
    <h1>{data.anzeige.title}</h1>
  </div>
  <div class="two-column">
    <div class="panel">
      <p class="description">{data.anzeige.description}</p>
    </div>
    <section class="panel" aria-labelledby="bewerbung">
      <h2 id="bewerbung">Bewerbung</h2>
      <form class="form-fields" method="POST" action="?/bewerben">
        <div>
          <label for="name">Name</label>
          <input
            id="name"
            name="name"
            autocomplete="name"
            value={form?.name ?? ''}
            aria-invalid={form?.nameError ? true : undefined}
            aria-describedby={form?.nameError ? 'name-error' : 'name-hint'}
            required
          />
          <small id="name-hint">Höchstens {MAX_NAME_LENGTH} Zeichen</small>
          {#if form?.nameError}
            <p id="name-error" class="error" role="alert">{form.nameError}</p>
          {/if}
        </div>
        <div>
          <label for="email">E-Mail-Adresse</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            value={form?.email ?? ''}
            aria-invalid={form?.emailError ? true : undefined}
            aria-describedby={form?.emailError ? 'email-error' : undefined}
            required
          />
          {#if form?.emailError}
            <p id="email-error" class="error" role="alert">{form.emailError}</p>
          {/if}
        </div>
        <div>
          <label for="text">Bewerbungstext</label>
          <textarea
            id="text"
            name="text"
            rows="6"
            value={form?.text ?? ''}
            aria-invalid={form?.textError ? true : undefined}
            aria-describedby={form?.textError ? 'text-error' : 'text-hint'}
            required
          ></textarea>
          <small id="text-hint"
            >Höchstens {MAX_BEWERBUNGSTEXT_LENGTH} Zeichen</small
          >
          {#if form?.textError}
            <p id="text-error" class="error" role="alert">
              {form.textError}
            </p>
          {/if}
        </div>
        <button type="submit">Bewerbung absenden</button>
      </form>
    </section>
  </div>
</div>

<style>
  .description {
    white-space: pre-wrap;
  }
</style>
