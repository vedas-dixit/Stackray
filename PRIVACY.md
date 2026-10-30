# Privacy

Stackray collects nothing and makes no network requests.

It runs only when you open it on a tab, by clicking the toolbar icon or pressing `Alt+Shift+S`. It then reads the page's DOM and computed styles to build a snapshot of the layers, and takes screenshots of the visible tab so the 3D layers can show the page's own pixels. The snapshot and the screenshots stay in memory in that tab and are dropped when you close Stackray. Nothing is sent anywhere, stored on a server or shared with anyone, including me.

There is no account, no analytics, no telemetry and no remote code. Everything the extension runs ships inside the extension package.

## What it touches

- **It scrolls the page while taking screenshots.** Stackray photographs the page one screen at a time, up to six screens, then scrolls back to where you were. As with normal scrolling, this can trigger lazy-loaded images or the page's own scroll handlers.
- **It leaves two things in the page.** A `<style>` tag with font-face rules stays until the page reloads. The sizes of Stackray's windows are saved in the page's own `localStorage`, under a `stackray:layout:` key, so they are the same next time. The page's scripts can see both.
- **A page may be able to detect the extension.** Its fonts are exposed as web-accessible resources, so a page that knows the extension ID can check for them.
- **Snapshots can contain page information.** Nothing is written to disk by the extension. If you capture a snapshot JSON with the repository's tooling to report a bug, check it before sharing: it includes the page URL and title, element ids and classes, `aria-label` values and sometimes up to 30 characters of an element's text.

## Permissions

- `activeTab` lets Stackray run in the tab you clicked, and only after you click. It also allows the screenshot of that tab.
- `scripting` is needed to inject the viewer into that tab when you ask for it.

Stackray asks for no host permissions, so it has no access to any page until you open it there.

## Questions

Open an issue at <https://github.com/vedas-dixit/Stackray/issues> or email <vedasdixit.work@gmail.com>.

Last updated 30 October 2026.
