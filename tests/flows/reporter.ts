import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter'
import { flowDefinition, flowId } from './catalog'
import { checkFlowReferences, publishFlow } from './artifacts'
import type { CaptureManifest, CapturePlatform } from './artifacts'

export default class FlowReporter implements Reporter {
  private results = new Map<string, { test: TestCase; result: TestResult }>()
  private errors: string[] = []
  private revision: string | null = null
  private sourceDirty: boolean | null = null

  onBegin(_config: FullConfig, suite: Suite): void {
    try {
      const seen = new Set<string>()
      for (const test of suite.allTests()) {
        const id = flowId(test.annotations)
        if (seen.has(id) || basename(test.location.file) !== flowDefinition(id).testFile || !test.tags.includes(`@${id}`)) throw new Error(`Duplicate, untagged or misplaced flow: ${id}`)
        seen.add(id)
      }
      this.revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
      this.sourceDirty = Boolean(execFileSync('git', ['status', '--porcelain', '--', 'src', 'tests', 'scripts', 'package.json', 'package-lock.json', 'playwright.config.ts'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim())
    } catch (error) { this.errors.push(String(error)) }
  }

  onTestEnd(test: TestCase, result: TestResult): void { this.results.set(test.id, { test, result }) }

  async onEnd(run: FullResult): Promise<{ status: FullResult['status'] } | void> {
    if (run.status === 'interrupted') return
    const root = resolve('ref/flows')
    const preflightFailed = this.errors.length > 0
    for (const { test, result } of this.results.values()) {
      if (result.status !== 'passed' || test.expectedStatus !== 'passed' || preflightFailed) continue
      try {
        const id = flowId(test.annotations)
        const attachment = result.attachments.find(item => item.name === 'flow-captures')
        if (!attachment) throw new Error(`Missing flow recorder: ${id}`)
        const recording = JSON.parse((attachment.body ?? await readFile(attachment.path!)).toString()) as Pick<CaptureManifest, 'flow' | 'captures' | 'capturedAt' | 'testSha256'> & { outputDir: string }
        if (recording.flow !== id) throw new Error('Wrong capture attachment')
        const platform: CapturePlatform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux'
        await publishFlow(root, recording.outputDir, { flow: id, captures: recording.captures, capturedAt: recording.capturedAt, testSha256: recording.testSha256, schemaVersion: 1, platform,
          testFile: `tests/desktop/${flowDefinition(id).testFile}`, testTitle: test.title,
          revision: this.revision, sourceDirty: this.sourceDirty, evidence: 'isolated-fixture' })
      } catch (error) { this.errors.push(String(error)) }
    }
    try { await checkFlowReferences(root) } catch (error) { this.errors.push(String(error)) }
    if (this.errors.length) {
      console.error('Flow reference publication failed:\n' + this.errors.join('\n'))
      return { status: 'failed' }
    }
  }
}
