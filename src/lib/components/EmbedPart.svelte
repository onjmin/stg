<script lang="ts">
  import {
    clearActiveController,
    embedSoundCloud,
  } from "$lib/background-embed";

  let { embedUrl } = $props();

  $effect(() => {
    try {
      embedSoundCloud({
        iframeDOM: document.querySelector("#musicfm-embed iframe"),
      });
    } catch (err) {
      console.error("Invalid SoundCloud URL", err);
    }

    return () => {
      clearActiveController();
    };
  });
</script>

<div id="musicfm-embed" style="visibility: hidden;">
  {#if embedUrl}
    <script src="https://w.soundcloud.com/player/api.js"></script>
    <iframe
      class="w-full h-full block"
      title="embed"
      src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(embedUrl)}&visual=true`}
      allow="autoplay"
      scrolling="no"
      frameborder="no"
    ></iframe>
  {/if}
</div>
