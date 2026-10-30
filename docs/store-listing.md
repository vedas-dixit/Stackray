# Chrome Web Store listing

The copy and the settings for Stackray's Chrome Web Store listing, in the order the dashboard asks for them. Paste from here rather than retyping. When the manifest in [apps/extension/wxt.config.ts](../apps/extension/wxt.config.ts) or [PRIVACY.md](../PRIVACY.md) changes, change this file too; the review compares all three.

## Account settings, once

The dashboard is at <https://chrome.google.com/webstore/devconsole>. Under **Settings** before the first upload:

1. **Publisher display name.** Shown on the listing under "Offered by". It defaults to the account email; change it to `Vedas Dixit`.
2. **Contact email.** Required to publish, shown publicly on the listing. Use `vedasdixit.work@gmail.com` so it matches PRIVACY.md and the README, then click the verification link Google sends.
3. **Trader declaration.** Required once per publisher; it is a legal self-declaration under EU consumer law, not a plan tier. Non-trader means you publish outside your trade or business. Trader means you publish for business purposes, and then your address, email and phone number are shown on the listing. Stackray is a free, MIT-licensed side project, which fits non-trader; if you decide to publish it under a company, pick trader and fill in the address.
4. **Address.** Required for traders and for items that sell anything; otherwise optional.
5. **2-step verification.** Must be on for the Google account that publishes, or the submit button refuses.
6. **Members.** Optional. The new account is the admin; inviting your everyday Google account as an editor saves switching accounts later.
7. **Notifications.** Turn on email for "Item review completed".

Trusted tester accounts, the service account and organization publishing are not needed. The item support toggle can stay off; GitHub issues is the support link.

## Build and upload

```sh
pnpm --filter @stackray/extension zip
```

The Chrome zip lands at `apps/extension/.output/stackrayextension-<version>-chrome.zip` (the Firefox zip and a sources zip appear next to it; neither is needed for Chrome). The version comes from `apps/extension/package.json`, which changesets bumps (`pnpm changeset`, then `pnpm changeset version`). Each upload must have a higher version than the last.

In the dashboard, **New item**, drop the zip, and the **Package** tab shows the manifest it read. Check it says version `0.1.0`, permissions `activeTab` and `scripting`, and no host permissions.

## Store listing tab

**Title**: from the manifest, `Stackray`.

**Summary**: from the manifest description, 132 characters at most. Current text:

> Lift any web page into a 3D stack of its layers. See stacking contexts, z-index, clipping and invisible overlays.

**Description**:

```text
Stackray lifts the page you are looking at into a 3D stack of its layers, inside a small retro-Mac window on top of the tab. It shows what the browser sees: stacking contexts, z-index, clipping and the invisible overlays sitting on top of everything.

Click the toolbar icon or press Alt+Shift+S (Option+Shift+S on a Mac). The page shrinks into the window and its layers spread out in depth, ordered by the browser's computed paint order. Press Esc to put the page back.

What you can do

- Orbit, pan and zoom the stack. Hover a layer for its tooltip, click to select it, double-click to return to the page with that element outlined.
- Switch color modes with 1 to 5: depth, stacking contexts, z-index heat, problems and plain. Each mode has a legend.
- Problems mode marks the usual suspects in red: elements trapped in a stacking context, so a bigger z-index does nothing, and invisible elements that may be catching your clicks. Elements cut off by an overflow: hidden ancestor get a red dashed edge.
- T gives leaf layers their own pixels from a screenshot of the page.
- S arranges the layers as a staircase in paint order.
- L opens the z-index ladder, the elements competing directly under the root stacking context.
- / searches the layer tree. ? lists every shortcut.

Privacy

Stackray makes no network requests and has no account, analytics or telemetry. It only runs on a tab when you open it there. The snapshot and screenshots stay in memory in that tab and are dropped when you close it. Policy: https://github.com/vedas-dixit/Stackray/blob/main/PRIVACY.md

Stackray is open source under the MIT license: https://github.com/vedas-dixit/Stackray

This is an early release. Textured mode covers the first six screens of a long page; layers further down stay plain. Bug reports with the page URL are welcome on GitHub.
```

**Category**: Developer Tools. **Language**: English.

**Store icon**: `apps/extension/public/icon/128.png`, 128 × 128 PNG.

**Screenshots**: one to five, exactly 1280 × 800 or 640 × 400, JPEG or 24-bit PNG with no transparency, no padding or rounded corners. GIFs are not accepted. None of the images in `docs/` are that size yet, so these need a crop:

| Shot                           | Source to crop from                            |
| ------------------------------ | ---------------------------------------------- |
| A page lifted, depth mode      | `docs/youtube-depth.jpg` (1600 × 970)          |
| Problems mode, dropdown in red | the frame behind `docs/gifs/why-behind.gif`    |
| Textured planes from above     | `docs/youtube-top.jpg` (1600 × 979)            |
| Staircase view                 | the frame behind `docs/gifs/staircase.gif`     |
| Search and the z-index ladder  | the frame behind `docs/gifs/search-ladder.gif` |

**Small promo tile**: 440 × 280 JPEG or PNG. Marked optional, but it is the image on the category and search pages, so make one: logo on the cream background with the one-line summary. **Marquee tile**: 1400 × 560, only used if Google features the item; skip for now.

**Homepage URL**: `https://github.com/vedas-dixit/Stackray`. **Support URL**: `https://github.com/vedas-dixit/Stackray/issues`. The **Official URL** field only accepts a site verified in Search Console; `vedasdixit.com` can go there once verified, otherwise leave it empty. **Mature content**: no.

## Privacy practices tab

**Single purpose**:

```text
Stackray shows the layers of the current page in 3D (stacking contexts, z-index, clipping and invisible overlays) so developers can see why an element is behind another or why a click does not reach it. It has no other function.
```

**Permission justifications**:

- `activeTab`:

  ```text
  Stackray runs only in the tab where the user clicks the toolbar icon or presses the shortcut. activeTab grants access to that tab after that gesture and nothing else. It also allows captureVisibleTab, which provides the screenshot that textures the 3D layers. No host permissions are requested.
  ```

- `scripting`:

  ```text
  Used to inject the content script (the layer capture and the 3D viewer) into the active tab when the user clicks the icon. Nothing is injected before that. The viewer is removed from the page when the user presses Esc or clicks the icon again.
  ```

- Host permissions: none. If a reviewer asks about `web_accessible_resources` matching `<all_urls>`: the entries are the two font files, which the viewer loads inside its shadow root on whichever page the user opened it; they give no access to any page.

**Remote code**: No. Three.js, Preact and the fonts ship inside the package. The extension loads nothing from the network.

**Data usage**: tick no data types. Stackray reads the page's DOM and screenshots the tab inside the browser and never stores or transmits any of it. Tick the three certifications: no selling or transferring user data to third parties, no use unrelated to the single purpose, no use for creditworthiness or lending.

**Privacy policy URL**: `https://github.com/vedas-dixit/Stackray/blob/main/PRIVACY.md`

## Distribution tab

Public, all regions, free. Unlisted is the alternative if you want to try the store link quietly first.

## Submit

Click **Submit for review**. Leave "publish automatically after review" on. Review for a new publisher usually takes a few days, occasionally longer. The result arrives at the notification email. A rejection names the policy; fixing listing text does not need a new zip, a code change does.

## After it is live

- Replace the "chrome · load unpacked" badge in the README with a store badge linking to the listing, and rewrite the first lines of "Try it locally" to lead with the store install.
- Add the store link to the launch posts in SPEC.md §12.
- Firefox Add-ons and Edge Add-ons come later (SPEC.md §5, v1.5). The Firefox zip from the same command is untested.
