# Vridhi Media Tools

Static, client-side image / PDF / video editor. No backend, no uploads — everything runs in the visitor's browser.

## Deploy on GitHub Pages
1. Push these 5 files (`index.html`, `image-tools.js`, `pdf-tools.js`, `video-tools.js`, this README) to a repo, e.g. at path `/tools/`.
2. In the repo Settings → Pages, set the source branch/folder.
3. It will be live at `https://<username>.github.io/<repo>/` (or your custom domain / subpath, e.g. `vridhi.in/tools/`).

## What's included
- **Image**: background remove (color-key), crop/resize, filters, compress, format convert (PNG/JPEG/WebP)
- **PDF**: merge, split/extract pages, rotate, images→PDF, PDF→images (uses pdf-lib + pdf.js from CDN)
- **Video**: trim + compress/resize, exported as WebM (browsers have no built-in MP4 encoder, so MP4 output would need a server step)

## Notes
- Background removal is simple color-key, not ML segmentation — best on flat/simple backgrounds.
- Video processing re-plays and re-records the clip in real time (takes roughly as long as the clip's length) — this is a browser limitation, not a bug.
- pdf-lib and pdf.js are loaded from jsDelivr/cdnjs CDNs in `index.html` — no npm install needed for a static deploy.
