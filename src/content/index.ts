function extractAndSendMetadata() {
  try {
    const url = window.location.href;
    if (!url.startsWith('http')) return;

    const desc = (
      document.querySelector('meta[name="description"]') as HTMLMetaElement
    )?.content;
    const ogImage = (
      document.querySelector('meta[property="og:image"]') as HTMLMetaElement
    )?.content;

    chrome.runtime.sendMessage({
      type: 'PAGE_METADATA',
      payload: {
        url,
        description: desc || undefined,
        ogImage: ogImage || undefined,
      },
      timestamp: Date.now(),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

if (document.readyState === 'complete') {
  setTimeout(extractAndSendMetadata, 800);
} else {
  window.addEventListener('load', () => setTimeout(extractAndSendMetadata, 800));
}