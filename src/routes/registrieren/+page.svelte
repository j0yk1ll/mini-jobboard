<script lang="ts">
  import CredentialsForm from '#lib/CredentialsForm.svelte';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();
</script>

<CredentialsForm registration {form} />
