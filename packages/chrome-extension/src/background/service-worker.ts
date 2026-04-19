// MV3 service worker. Skeleton: install handler + message router placeholder.
// El auth flow real se cablea en 7.E.3; el relay a /api/market/capture en 7.E.4.

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.storage.local.set({ dmx_capture_count: 0 });
  }
});

interface RuntimeMessage {
  type: string;
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse): boolean => {
  if (message.type === 'dmx:ping') {
    sendResponse({ ok: true });
    return false;
  }
  sendResponse({ ok: false, error: `unknown_message_type:${message.type}` });
  return false;
});
