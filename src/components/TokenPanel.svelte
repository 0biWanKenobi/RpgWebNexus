<script lang="ts">
    export let tokenResult: Record<string, string> = {};
    let revealedKeys = new Set<string>();

    function isSensitiveTokenField(key: string) {
        return key.includes("token");
    }

    function maskValue(value: string) {
        if (value.length <= 12) {
            return "••••••••";
        }

        return `${value.slice(0, 6)}••••••${value.slice(-4)}`;
    }

    function toggleReveal(key: string) {
        const next = new Set(revealedKeys);

        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }

        revealedKeys = next;
    }
</script>

<div class="response-panel">
    <p class="response-title">OAuth result</p>
    {#each Object.entries(tokenResult) as [key, value]}
        <div class="token-row">
            <p class="token-key">{key}</p>
            <div class="token-value-row">
                <pre>{isSensitiveTokenField(key) && !revealedKeys.has(key)
                        ? maskValue(value)
                        : value}</pre>
                {#if isSensitiveTokenField(key)}
                    <button
                        class="toggle-button"
                        type="button"
                        on:click={() => toggleReveal(key)}
                    >
                        {revealedKeys.has(key) ? "Hide" : "Reveal"}
                    </button>
                {/if}
            </div>
        </div>
    {/each}
</div>
