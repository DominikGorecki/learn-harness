import { test as base, expect } from '@playwright/test'
import type { ElectronApplication, Page, TestInfo } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { flowDefinition, flowId } from './catalog'
import { digest, pngSize } from './artifacts'
import type { Capture } from './artifacts'

export class FlowRecorder {
  readonly captures: Capture[] = []
  constructor(readonly id: string, private info: TestInfo) {
    if (basename(info.file) !== flowDefinition(id).testFile) throw new Error('Flow belongs to a different test file')
  }

  async capture(desktop: ElectronApplication, page: Page, id: string, options: { fullPage?: boolean; verifiedNativeBitmap?: Buffer } = {}): Promise<void> {
    const caption = flowDefinition(this.id).screenshots[id]
    if (!caption || this.captures.some(item => item.id === id)) throw new Error(`Unknown or duplicate capture: ${this.id}/${id}`)
    const window = await desktop.browserWindow(page)
    const zoom = await window.evaluate(window => window.webContents.getZoomFactor())
    const state = await page.evaluate(() => {
      const browser = globalThis as unknown as { document: { documentElement: { getAttribute(name: string): string | null } }; innerWidth: number; innerHeight: number }
      return { theme: browser.document.documentElement.getAttribute('data-theme'), viewport: { width: browser.innerWidth, height: browser.innerHeight } }
    })
    // Closed <details> children can retain a bounding rectangle despite not
    // being painted. Only their open state needs masking/native exclusion.
    const paths = page.locator('.project-path, .unavailable-path, .project-folder[open] > p')
    const hasVisiblePath = await paths.evaluateAll(elements => elements.some(element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0))
    const path = this.info.outputPath(`${id}.png`)
    let bytes: Buffer
    const native = zoom !== 1 || options.verifiedNativeBitmap !== undefined
    if (native) {
      if (hasVisiblePath) throw new Error('Collapse local paths before native Electron capture')
      // Retain an actual native frame that already passed a paint assertion;
      // re-capturing would introduce a second compositor race.
      if (options.verifiedNativeBitmap) bytes = options.verifiedNativeBitmap
      else {
        const encoded = await window.evaluate(async window => (await window.webContents.capturePage()).toPNG().toString('base64'))
        bytes = Buffer.from(encoded, 'base64')
      }
      await writeFile(path, bytes)
    } else bytes = await page.screenshot({ path, animations: 'disabled', caret: 'hide', fullPage: options.fullPage, mask: [paths], maskColor: '#808080' })
    this.captures.push({ id, caption, ...pngSize(bytes), ...state, zoom,
      method: native ? 'electron' : 'playwright', maskedLocalPaths: !native && hasVisiblePath, sha256: digest(bytes) })
    await this.info.attach(id, { path, contentType: 'image/png' })
  }

  async attach(): Promise<void> {
    await this.info.attach('flow-captures', { body: Buffer.from(JSON.stringify({ flow: this.id, captures: this.captures,
      outputDir: this.info.outputDir, capturedAt: new Date().toISOString(), testSha256: digest(await readFile(this.info.file)) })), contentType: 'application/json' })
  }
}

export const test = base.extend<{ flow: FlowRecorder }>({
  flow: [async ({ playwright }, use, info) => {
    void playwright
    const recorder = new FlowRecorder(flowId(info.annotations), info)
    try { await use(recorder) } finally { await recorder.attach() }
  }, { auto: true }]
})
export { expect }
