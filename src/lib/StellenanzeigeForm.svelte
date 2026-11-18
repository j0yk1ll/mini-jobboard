<script lang="ts">
  import {
    MAX_DESCRIPTION_LENGTH,
    MAX_TITLE_LENGTH
  } from '#lib/stellenanzeige.ts';

  let {
    action,
    submitLabel,
    form,
    anzeige
  }: {
    action: string;
    submitLabel: string;
    form: {
      title?: string;
      description?: string;
      titleError?: string;
      descriptionError?: string;
    } | null;
    anzeige?: { title: string; description: string };
  } = $props();
</script>

<form method="POST" {action}>
  <div>
    <label for="title">Titel</label>
    <input
      id="title"
      name="title"
      value={form?.title ?? anzeige?.title ?? ''}
      aria-invalid={form?.titleError ? true : undefined}
      aria-describedby={form?.titleError ? 'title-error' : 'title-hint'}
      required
    />
    <small id="title-hint">Höchstens {MAX_TITLE_LENGTH} Zeichen</small>
    {#if form?.titleError}
      <p id="title-error" class="error" role="alert">{form.titleError}</p>
    {/if}
  </div>
  <div>
    <label for="description">Beschreibung</label>
    <textarea
      id="description"
      name="description"
      rows="6"
      value={form?.description ?? anzeige?.description ?? ''}
      aria-invalid={form?.descriptionError ? true : undefined}
      aria-describedby={form?.descriptionError
        ? 'description-error'
        : 'description-hint'}
      required
    ></textarea>
    <small id="description-hint"
      >Höchstens {MAX_DESCRIPTION_LENGTH} Zeichen</small
    >
    {#if form?.descriptionError}
      <p id="description-error" class="error" role="alert">
        {form.descriptionError}
      </p>
    {/if}
  </div>
  <button type="submit">{submitLabel}</button>
</form>

<style>
  form {
    display: grid;
    gap: 1rem;
  }

  label,
  small {
    display: block;
  }

  label {
    margin-bottom: 0.25rem;
    font-weight: 650;
  }

  input,
  textarea {
    box-sizing: border-box;
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid #6d8177;
    border-radius: 0.375rem;
    color: inherit;
    font: inherit;
  }

  textarea {
    resize: vertical;
  }

  .error {
    margin: 0.25rem 0 0;
    color: #8a2119;
  }
</style>
