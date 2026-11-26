
<script lang="ts">
    import { onMount } from "svelte";

    function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let taps = $state(0);
    let url = $state("");
    let loading = $state(false);
    let status = $state("hallo");

    let cade: HTMLImageElement;

    let cadePic = $derived(
        loading
            ? "https://i.imgur.com/xuJcdyF.gif"
            : taps >= 10
                ? "https://i.imgur.com/1r2Lvl4.png"
                : "https://i.imgur.com/y5mZhbK.png"
    );

    async function tapCade() {
        if (!loading) {
            cade.classList.add("jump");
            await sleep(100);
            cade.classList.remove("jump");
            taps++;
        }
    }

    onMount(() => {
        let animate = true;

        async function moveUpLoop() {
            while (animate) {
                const interval = Math.random() * 4000 + 1000;
                await sleep(interval);

                if (!animate) break;

                if (cade && !loading) {
                    cade.style.top = "-20px";
                    await sleep(150);

                    if (animate) {
                        cade.style.top = "0px";
                    }
                }
            }
        }

        async function flipLoop() {
            while (animate) {
                const interval = Math.random() * 4000 + 1000;
                await sleep(interval);

                if (!animate) break;

                if (cade && !loading) {
                    cade.style.transform = "scaleX(-1)";
                    await sleep(Math.random() * 1000 + 100);

                    if (animate) {
                        cade.style.transform = "scaleX(1)";
                    }
                }
            }
        }

        async function calmLoop() {
            while (animate) {
                if (taps > 0) {
                    taps--;
                }

                await sleep(1000);
            }
        }

        void moveUpLoop();
        void flipLoop();
        void calmLoop();

        return () => {
            animate = false;
        };
    });

    async function download(event: SubmitEvent): Promise<void> {
        event.preventDefault();

        let button = event.submitter;

        if (loading || button === null) return;

        loading = true;

        cade.style.top = "0px";
        cade.style.transform = "scaleX(1)";

        let downloadKind = button.id === "1" ? "audio" : "video";

        status = `now download ${downloadKind}...`;

        try {
            const response = await fetch("/api/download", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url: url.trim(),
                    kind: downloadKind
                })
            });

            if (!response.ok) {
                switch (response.status) {
                    case 429:
                        status = "slow down!!!";
                        break;
                    default:
                        status = "fail :(";
                        break;
                }

                console.error(`download failed! (status: ${response.status})`);
                return;
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const anchor = document.createElement("a");
            anchor.href = objectUrl;

            const disposition = response.headers.get("Content-Disposition");
            const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? "download";

            anchor.download = filename;

            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
            }, 30_000);

            status = "ok!";
        } catch (error) {
            status = "fail :(";
            console.error("download failed!", error);
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>cade yt downloader</title>
</svelte:head>

<div id="container">
    <img src="https://i.imgur.com/0DzCGlE.gif" alt="cade youtube downloader" width="700px">
    <div id="cade-block">
        <button type="button" onclick={tapCade}>
            <img id="cade" src={cadePic} alt="cade" bind:this={cade}>
        </button>
        <hgroup>
            <p aria-live="polite" class="speech-bubble">{status}</p>
        </hgroup>
    </div>
    <form onsubmit={download}>
        <input
            type="url"
            placeholder="youtube url goes here"
            bind:value={url}
            required
        />

        <div id="download-container">
            <button type="submit" disabled={loading} id=1>
                download audio (mp3)
            </button>
            <button type="submit" disabled={loading} id=2>
                download video (mp4)
            </button>
        </div>
    </form>
</div>
