function extractAndSendMetadata() {
  try {
    const desc = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content;
    const ogImage = (document.querySelector('meta[property="og:image"]') as HTMLMetaElement)?.content;
    const wordCount = (document.body?.innerText || '').split(/\s+/).filter(Boolean).length;

    chrome.runtime.sendMessage({
      type: 'PAGE_METADATA',
      payload: { url: window.location.href, description: desc, ogImage, wordCount },
      timestamp: Date.now(),
    }).catch(() => {});
  } catch {
    // extension context invalidated
  }
}

if (document.readyState === 'complete') {
  setTimeout(extractAndSendMetadata, 500);
} else {
  window.addEventListener('load', () => setTimeout(extractAndSendMetadata, 500));
}