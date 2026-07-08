# 📱 Workspace Chat — PWA Installation Guide

Turn your Vercel-hosted chat app (`https://chat-gamma-mauve.vercel.app/`) into an installable **Progressive Web App** in **3 steps**.

---

## 📦 What's in this package

```
workspace-chat-pwa/
├── manifest.json           ← PWA manifest (name, icons, theme)
├── service-worker.js       ← Offline support + caching
├── offline.html            ← Fallback page when no network
├── pwa-inject.html         ← Snippet to paste into your index.html
├── icons/                  ← All required icon sizes (16×16 → 1024×1024)
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── icon-{72,96,128,144,152,167,180,192,256,384,512,1024}.png
│   └── maskable-{192,512}.png
└── INSTALL.md              ← This file
```

---

## 🚀 3-Step Deployment

### **Step 1: Copy files into your repo**

Copy these into your existing `Jeff-YANGONtv/Chat` repository:

| Source                          | Destination in repo         |
| ------------------------------- | --------------------------- |
| `manifest.json`                 | `public/manifest.json`      |
| `service-worker.js`             | `public/service-worker.js`  |
| `offline.html`                  | `public/offline.html`       |
| `icons/` (entire folder)        | `public/icons/`             |

Your `public/` folder should now look like:
```
public/
├── index.html          (existing)
├── manifest.json       (new)
├── service-worker.js   (new)
├── offline.html        (new)
└── icons/
    ├── favicon.ico
    ├── apple-touch-icon.png
    └── icon-*.png ...
```

---

### **Step 2: Edit `public/index.html`**

Open `pwa-inject.html`. Inside it are **two blocks** clearly marked with `START` / `END`.

1. **Head block** → paste before `</head>` in `index.html`
2. **Body block** → paste right before `</body>` in `index.html`

That's it. No JS framework changes required.

---

### **Step 3: Verify Vercel serves the files correctly**

Add / update `vercel.json` in your repo root:

```json
{
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600" },
        { "key": "Content-Type", "value": "application/manifest+json" }
      ]
    },
    {
      "source": "/icons/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

> ⚠️ If your existing `vercel.json` already has routes/rewrites for the API, **merge** the `headers` array into it instead of overwriting.

Commit → push → Vercel redeploys automatically.

---

## ✅ Testing

Once deployed, visit `https://chat-gamma-mauve.vercel.app/`:

| Platform             | How to install                                                       |
| -------------------- | -------------------------------------------------------------------- |
| **Android Chrome**   | Install banner pops up at the bottom → tap **Install**               |
| **Desktop Chrome/Edge** | Address bar → ⊕ install icon on the right                         |
| **iOS Safari**       | Tap Share → **Add to Home Screen**                                   |
| **Samsung Internet** | Menu → **Add page to** → **Home screen**                             |

Then look for the **Workspace Chat** icon on your home screen — tapping it opens the app **fullscreen, no browser UI**, just like a native app.

### Verify it's really a PWA

Open Chrome DevTools → **Application** tab:
- ✅ **Manifest** shows "Workspace Chat" with all icons
- ✅ **Service Workers** shows `service-worker.js` as *activated and running*
- Run **Lighthouse → PWA audit** → should score ≥ 90

---

## 🎨 Customization

| What                      | Where                                                             |
| ------------------------- | ----------------------------------------------------------------- |
| Change app name           | `manifest.json` → `name`, `short_name`                            |
| Change theme color        | `manifest.json` → `theme_color`, `background_color` + `<meta>` in `index.html` |
| Change icon               | Replace `icons/source.png` and re-run `generate_icons.py`         |
| Change offline page       | Edit `offline.html`                                               |
| Adjust cache strategy     | Edit `service-worker.js`                                          |

---

## 🐛 Troubleshooting

**Service worker not registering?**
- Must be served over **HTTPS** (Vercel does this by default ✅)
- Check DevTools → Console for errors
- Ensure `service-worker.js` is at the **root** (`/service-worker.js`), not `/public/service-worker.js`

**Install banner not showing?**
- PWA requirements: valid manifest + HTTPS + service worker + at least one `192x192` icon (all done ✅)
- Chrome only shows the banner after the user has engaged with the site once
- On iOS, there's no automatic banner — users must Share → Add to Home Screen

**Old version keeps showing after update?**
- Bump `CACHE_VERSION` in `service-worker.js` (e.g. `v1.0.0` → `v1.0.1`)
- Or in DevTools → Application → Service Workers → **Update on reload** during dev

---

Enjoy your new installable app! 🎉
