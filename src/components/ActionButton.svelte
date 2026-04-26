<script lang="ts">
    const {
        disabled,
        onclick,
        children
    }: {disabled: boolean, onclick: () => void, children: any} = $props();


</script>

<div class="button-slot">
  <button
    class="google-button"
    type="button"
    disabled={disabled}
    onclick={onclick}
  >
    {@render children()}
  </button>
</div>