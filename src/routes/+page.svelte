<script lang="ts">
    let url = $state("");
    let loading = $state(false);
    let status = $state("hi");

    async function download(event: SubmitEvent): Promise<void> {
        event.preventDefault();

        if (loading) return;

        loading = true;
        status = "downloading...";

        try {
            const response = await fetch("/api/download", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url: url.trim()
                })
            });

            if (!response.ok) {
                const result: { error?: string } | null =
                    await response.json().catch(() => null);

                throw new Error(
                    "download failed!"
                );
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = "cade-download.mp3";

            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
            }, 30_000);

            status = "done!";
        } catch (error) {
            status = error instanceof Error
                ? error.message
                : "download failed!";
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>cade yt downloader</title>
</svelte:head>

<div id="container">
    <p>cade youtube download</p>
    <form onsubmit={download}>
        <input
            type="url"
            placeholder="youtube url goes here"
            bind:value={url}
            required
        />

        <button type="submit" disabled={loading}>
            {loading ? "downloading..." : "download audio (mp3)"}
        </button>
    </form>

    <div id="cade">
        <img src="https://i.imgur.com/y5mZhbK.png" alt="cade">
        <hgroup>
            <p aria-live="polite" class="speech-bubble">{status}</p>
        </hgroup>
    </div>
</div>
