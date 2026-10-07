/* global require, process, Buffer */
/* eslint-disable @typescript-eslint/no-require-imports -- Electron's standalone build helper uses CommonJS. */
// Build tooling only. The renderer has no Node/preload capabilities or network.
const { app, BrowserWindow, session } = require('electron')
const { readFileSync, writeFileSync } = require('node:fs')
const input = JSON.parse(readFileSync(process.argv[2], 'utf8'))
app.setPath('userData', input.profile)
app.whenReady().then(async () => {
  const isolated = session.fromPartition('branding-export')
  isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  isolated.setPermissionCheckHandler(() => false)
  isolated.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (_details, callback) => callback({ cancel: true }))
  const window = new BrowserWindow({ show: false, webPreferences: { session: isolated, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true } })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', event => event.preventDefault())
  await window.loadURL('data:text/html,<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:">')
  const results = await window.webContents.executeJavaScript(`(async () => {
    const jobs = ${JSON.stringify(input.jobs)};
    const results = [];
    for (const job of jobs) {
      const image = new Image(); image.src = 'data:image/svg+xml;base64,' + job.svg;
      await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = job.width; canvas.height = job.height;
      const context = canvas.getContext('2d', { colorSpace: 'srgb' });
      context.drawImage(image, 0, 0, job.width, job.height);
      const pixels = context.getImageData(0, 0, job.width, job.height).data;
      let left = job.width, top = job.height, right = -1, bottom = -1, transparent = 0, opaque = 0;
      for (let y = 0; y < job.height; y++) for (let x = 0; x < job.width; x++) {
        const alpha = pixels[(y * job.width + x) * 4 + 3];
        if (alpha === 0) transparent++; if (alpha === 255) opaque++;
        if (alpha > 0) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
      }
      results.push({ name: job.name, width: job.width, height: job.height, png: canvas.toDataURL('image/png').split(',')[1], alpha: { left, top, right, bottom, transparent, opaque } });
    }
    return results;
  })()`)
  for (const result of results) writeFileSync(input.output + '/' + result.name, Buffer.from(result.png, 'base64'))
  writeFileSync(input.report, JSON.stringify({ electron: process.versions.electron, chromium: process.versions.chrome, results: results.map(({ name, width, height, alpha }) => ({ name, width, height, alpha })) }))
  window.destroy(); app.quit()
}).catch(() => { process.exitCode = 1; app.quit() })
