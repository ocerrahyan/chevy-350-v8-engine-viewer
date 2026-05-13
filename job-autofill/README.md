# Job Autofill

A tiny, dependency-free static web app for filling out job applications faster on your phone.

- **Runs in mobile Safari** (and any other browser). Add it to your iPhone home screen for a one-tap launcher.
- **Stores everything in your phone's `localStorage`** — no server, no analytics, no network calls.
- **Tap-to-copy** every field, so you can flip back to a job site's tab and paste.
- **Bookmarklet** that embeds your data and auto-fills matching fields on any job site you're viewing — Greenhouse, Lever, Workday, Ashby, custom HR portals, etc.

## How to use

1. Open the site on your phone.
2. Fill in the **Profile**, **Experience**, **Education**, and **Extras** tabs.
3. Go to the **Tools** tab and tap **Generate / refresh**, then **Copy bookmarklet**.
4. Install the bookmarklet in Safari:
   - On any page, tap the Share icon → Add Bookmark → Save.
   - Open the Bookmarks list (book icon) → Edit → tap the new bookmark.
   - Clear the URL field, paste the bookmarklet, name it "Fill App", and save.
   - Move it into the **Favorites** folder so it appears under the Safari address bar.
5. On any job application, tap the address bar → tap **Fill App**. A toast confirms how many fields were filled.

Re-generate the bookmarklet whenever you update your info — the data is baked into the bookmarklet URL.

## What it does NOT do

- It does not submit applications.
- It does not overwrite fields you've already filled in.
- It cannot upload your resume PDF — file inputs can only be set by a real user gesture in browsers.
- It does not bypass CAPTCHAs or any anti-bot measures.

## Local development

Open `index.html` directly in a browser, or serve the folder:

```
cd job-autofill
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Privacy

All data is stored in `localStorage` on your device only. Use **Export JSON** in the Tools tab to back it up. The bookmarklet contains a snapshot of your data — keep your bookmarks private.

## Hosting

Auto-deployed to GitHub Pages on every push to `main` (and the active feature branch) via `.github/workflows/pages.yml`.

URL: https://ocerrahyan.github.io/chevy-350-v8-engine-viewer/
