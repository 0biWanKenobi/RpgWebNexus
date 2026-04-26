<script lang="ts">
    import ActionButton from "./ActionButton.svelte";


    const {obsidianUrl}: {obsidianUrl: string | null} = $props();

    const sendToObsidian = (url: string) =>{
        location.href = url;
    }

</script>

<ActionButton
    disabled={!obsidianUrl}
    onclick={() => sendToObsidian(obsidianUrl!)}
>    
    Connect to Obsidian
</ActionButton>