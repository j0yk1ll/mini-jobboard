<script lang="ts">
  import { resolve } from '$app/paths';
  import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '#lib/password.ts';

  let {
    registration = false,
    form
  }: {
    registration?: boolean;
    form?: {
      email?: string;
      message: string;
      confirmationError?: boolean;
    } | null;
  } = $props();

  const title = $derived(registration ? 'Registrieren' : 'Anmelden');
</script>

<svelte:head>
  <title>{title} | Mini-Jobboard</title>
</svelte:head>

<h1>{title}</h1>

{#if form?.message}
  <p id="credentials-error" class="error" role="alert">{form.message}</p>
{/if}

<form method="POST">
  <div>
    <label for="email">E-Mail-Adresse</label>
    <input
      id="email"
      name="email"
      type="email"
      autocomplete="email"
      value={form?.email ?? ''}
      required
    />
  </div>
  <div>
    <label for="password">Passwort</label>
    <input
      id="password"
      name="password"
      type="password"
      autocomplete={registration ? 'new-password' : 'current-password'}
      minlength={registration ? MIN_PASSWORD_LENGTH : undefined}
      maxlength={MAX_PASSWORD_LENGTH}
      aria-describedby={registration ? 'password-hint' : undefined}
      required
    />
    {#if registration}
      <small id="password-hint">Mindestens {MIN_PASSWORD_LENGTH} Zeichen</small>
    {/if}
  </div>
  {#if registration}
    <div>
      <label for="password-confirmation">Passwort bestätigen</label>
      <input
        id="password-confirmation"
        name="passwordConfirmation"
        type="password"
        autocomplete="new-password"
        maxlength={MAX_PASSWORD_LENGTH}
        aria-invalid={form?.confirmationError ? true : undefined}
        aria-describedby={form?.confirmationError
          ? 'credentials-error'
          : undefined}
        required
      />
    </div>
  {/if}
  <button type="submit">{title}</button>
</form>

{#if registration}
  <p>Du hast bereits ein Konto? <a href={resolve('/anmelden')}>Anmelden</a></p>
{:else}
  <p>
    Du hast noch kein Konto? <a href={resolve('/registrieren')}>Registrieren</a>
  </p>
{/if}

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

  input {
    box-sizing: border-box;
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid #6d8177;
    border-radius: 0.375rem;
    color: inherit;
    font: inherit;
  }

  small {
    margin-top: 0.25rem;
  }

  p:last-child {
    margin-bottom: 0;
  }

  .error {
    padding: 0.75rem;
    border: 1px solid #a63828;
    border-radius: 0.375rem;
    color: #8a2119;
  }
</style>
