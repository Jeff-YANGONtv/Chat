#!/usr/bin/env node
/**
 * Auto-patch script for Workspace Chat PWA
 * ─────────────────────────────────────────
 * Injects PWA meta tags + service-worker registration into an existing
 * public/index.html without touching anything else.
 *
 * Usage:
 *   node patch-index.js              # patches ./public/index.html
 *   node patch-index.js path/to.html # patches a custom file
 *
 * Idempotent: running it twice does nothing the second time.
 */
const fs = require("fs");
const path = require("path");

const TARGET = process.argv[2] || path.join("public", "index.html");
const MARKER_HEAD = "<!-- WORKSPACE-CHAT-PWA-HEAD -->";
const MARKER_BODY = "<!-- WORKSPACE-CHAT-PWA-BODY -->";

const HEAD_SNIPPET = `${MARKER_HEAD}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
<meta name="theme-color" content="#0d1117" />
<meta name="color-scheme" content="dark" />
<meta name="description" content="Workspace Chat — Business Admin Chat Hub." />
<link rel="manifest" href="/manifest.json" />
<link rel="icon" type="image/x-icon" href="/icons/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Workspace Chat" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
<link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
<meta name="msapplication-TileColor" content="#0d1117" />
<meta name="msapplication-TileImage" content="/icons/icon-144.png" />
<meta property="og:title" content="Workspace Chat" />
<meta property="og:description" content="Business Admin Chat Hub" />
<meta property="og:image" content="/icons/icon-512.png" />
<meta property="og:type" content="website" />
`;

const BODY_SNIPPET = `${MARKER_BODY}
<div id="pwa-install-banner" style="position:fixed;bottom:16px;left:16px;right:16px;background:linear-gradient(135deg,#161b22 0%,#0d1117 100%);border:1px solid #30363d;border-radius:16px;padding:14px 16px;display:none;z-index:9999;box-shadow:0 10px 40px rgba(0,0,0,.5);color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;align-items:center;gap:12px;">
  <img src="/icons/icon-96.png" alt="" style="width:44px;height:44px;border-radius:10px;flex-shrink:0;" />
  <div style="flex:1;min-width:0;">
    <div style="font-weight:600;font-size:14px;">Install Workspace Chat</div>
    <div style="font-size:12px;color:#8b949e;margin-top:2px;">Add to your home screen for quick access</div>
  </div>
  <button id="pwa-install-btn" style="background:linear-gradient(135deg,#2f81f7,#6f42c1);color:#fff;border:0;padding:8px 16px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;">Install</button>
  <button id="pwa-dismiss-btn" style="background:transparent;color:#8b949e;border:0;font-size:20px;cursor:pointer;padding:4px 8px;">×</button>
</div>
<script>
(function(){
  if("serviceWorker" in navigator){
    window.addEventListener("load",function(){
      navigator.serviceWorker.register("/service-worker.js",{scope:"/"})
        .then(function(reg){console.log("[PWA] SW registered:",reg.scope);setInterval(function(){reg.update();},60000);})
        .catch(function(err){console.warn("[PWA] SW failed:",err);});
    });
  }
  var deferredPrompt=null;
  var banner=document.getElementById("pwa-install-banner");
  var installBtn=document.getElementById("pwa-install-btn");
  var dismissBtn=document.getElementById("pwa-dismiss-btn");
  var dismissedAt=parseInt(localStorage.getItem("pwa-dismissed-at")||"0",10);
  var recentlyDismissed=(Date.now()-dismissedAt)<7*24*60*60*1000;
  window.addEventListener("beforeinstallprompt",function(e){
    e.preventDefault();deferredPrompt=e;
    if(banner&&!recentlyDismissed)banner.style.display="flex";
  });
  if(installBtn)installBtn.addEventListener("click",function(){
    if(!deferredPrompt)return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(c){deferredPrompt=null;if(banner)banner.style.display="none";});
  });
  if(dismissBtn)dismissBtn.addEventListener("click",function(){
    if(banner)banner.style.display="none";
    localStorage.setItem("pwa-dismissed-at",Date.now().toString());
  });
  window.addEventListener("appinstalled",function(){if(banner)banner.style.display="none";});
  var isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  var isStandalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
  if(isIOS&&!isStandalone&&!recentlyDismissed&&banner){
    var msg=banner.querySelector("div > div:nth-child(2)");
    if(msg)msg.textContent="Tap Share → Add to Home Screen";
    if(installBtn)installBtn.style.display="none";
    banner.style.display="flex";
  }
})();
</script>
`;

if (!fs.existsSync(TARGET)) {
  console.error(`❌  File not found: ${TARGET}`);
  console.error(`    Usage: node patch-index.js [path/to/index.html]`);
  process.exit(1);
}

let html = fs.readFileSync(TARGET, "utf8");

if (html.includes(MARKER_HEAD) || html.includes(MARKER_BODY)) {
  console.log(`✅  ${TARGET} is already patched. Nothing to do.`);
  process.exit(0);
}

// Backup
const backup = TARGET + ".bak";
fs.writeFileSync(backup, html);
console.log(`📦  Backup saved to ${backup}`);

// Inject head snippet
if (/<\/head>/i.test(html)) {
  html = html.replace(/<\/head>/i, `${HEAD_SNIPPET}\n</head>`);
} else {
  console.warn("⚠️  No </head> found — prepending head snippet");
  html = HEAD_SNIPPET + "\n" + html;
}

// Inject body snippet
if (/<\/body>/i.test(html)) {
  html = html.replace(/<\/body>/i, `${BODY_SNIPPET}\n</body>`);
} else {
  console.warn("⚠️  No </body> found — appending body snippet");
  html = html + "\n" + BODY_SNIPPET;
}

fs.writeFileSync(TARGET, html);
console.log(`✅  Successfully patched ${TARGET}`);
console.log(`\nNext steps:`);
console.log(`  1. Copy manifest.json, service-worker.js, offline.html into public/`);
console.log(`  2. Copy icons/ folder into public/icons/`);
console.log(`  3. Commit and push — Vercel will auto-deploy your PWA`);
