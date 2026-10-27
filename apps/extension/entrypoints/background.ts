/**
 * Toolbar click → inject the stage into the active tab, or toggle it if it
 * is already injected. `activeTab` grants access only to that tab, and only
 * after the click. The worker also answers two messages from the content
 * script: a screenshot of the visible tab, and a progress count for the badge.
 */
export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id === undefined) return;
    if (!canLift(tab.url)) {
      await flashBadge(tab.id, 'n/a', 'Stackray cannot run on browser pages');
      return;
    }
    // Inject once per page. After that the script is already there (with its
    // copy of Three.js), so a message toggles it instead of loading it again.
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'stackray:toggle' });
    } catch {
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['/content-scripts/stackray.js'],
        });
      } catch {
        await flashBadge(tab.id, 'n/a', 'Stackray cannot run on this page');
      }
    }
  });

  browser.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    const progress = progressText(message);
    if (progress !== null && sender.tab?.id !== undefined) {
      void browser.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#5b3a2a' });
      void browser.action.setBadgeText({ tabId: sender.tab.id, text: progress });
      return false;
    }
    if (!isScreenshotRequest(message)) return false;
    const windowId = sender.tab?.windowId;
    browser.tabs
      .captureVisibleTab(windowId as number, { format: 'png' })
      .then((dataUrl) => sendResponse(dataUrl))
      .catch(() => sendResponse(null));
    return true;
  });
});

function isScreenshotRequest(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'stackray:screenshot'
  );
}

function progressText(message: unknown): string | null {
  if (typeof message !== 'object' || message === null) return null;
  const m = message as { type?: unknown; text?: unknown };
  return m.type === 'stackray:progress' && typeof m.text === 'string' ? m.text : null;
}

/** Only ordinary web pages (and local files) can take a content script. */
function canLift(url: string | undefined): boolean {
  return url !== undefined && /^(https?|file):/.test(url);
}

/** A short badge note on the icon, since no page is there to show one. */
async function flashBadge(tabId: number, text: string, title: string): Promise<void> {
  try {
    await browser.action.setBadgeBackgroundColor({ tabId, color: '#c8372d' });
    await browser.action.setBadgeText({ tabId, text });
    await browser.action.setTitle({ tabId, title });
    setTimeout(() => {
      void browser.action.setBadgeText({ tabId, text: '' });
      void browser.action.setTitle({ tabId, title: 'Stackray: lift this page' });
    }, 2000);
  } catch {
    // The tab may be gone; nothing to show.
  }
}
