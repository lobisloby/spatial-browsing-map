function extractAndSendMetadata() {
  try {
    const url = window.location.href;

    // Skip non-http pages
    if (!url.startsWith('http')) return;

    const desc = (
      document.querySelector('meta[name="description"]') as HTMLMetaElement
    )?.content;
    const ogImage = (
      document.querySelector('meta[property="og:image"]') as HTMLMetaElement
    )?.content;
    const wordCount = (document.body?.innerText || '')
      .split(/\s+/)
      .filter(Boolean).length;

    chrome.runtime
      .sendMessage({
        type: 'PAGE_METADATA',
        payload: {
          url,
          description: desc || undefined,
          ogImage: ogImage || undefined,
          wordCount,
        },
        timestamp: Date.now(),
      })
      .catch(() => {
        // Extension context invalidated — ignore
      });
  } catch {
    // Silently fail
  }
}

// Run after page fully loads
if (document.readyState === 'complete') {
  setTimeout(extractAndSendMetadata, 800);
} else {
  window.addEventListener('load', () => setTimeout(extractAndSendMetadata, 800));
}