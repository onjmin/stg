<script lang="ts">
  import {
    clearActiveController,
    embedSoundCloud,
  } from "$lib/background-embed";

  let { embedUrl } = $props();

  let elm = $state();

  $effect(() => {
    if (!elm || !embedUrl) return;
    try {
      embedSoundCloud({
        iframeDOM: document.querySelector("#stg-embed iframe"),
      });
    } catch (err) {
      console.error("Invalid SoundCloud URL", err);
    }

    return () => {
      clearActiveController();
    };
  });
</script>

{#if embedUrl}
  <div id="stg-embed" class="fixed inset-0 w-full h-full -z-10">
    <script src="https://w.soundcloud.com/player/api.js"></script>
    <iframe
      bind:this={elm}
      title="embed"
      src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(embedUrl)}&visual=true`}
      allow="autoplay"
      scrolling="no"
      frameborder="no"
    ></iframe>
  </div>
{/if}
