import { afterEach, expect, it, vi } from 'vitest'
import type { FullResult, TestCase, TestResult } from '@playwright/test/reporter'
import FlowReporter from '../flows/reporter'
import * as artifacts from '../flows/artifacts'

afterEach(() => { vi.restoreAllMocks() })
function testCase(id = 'appearance', expectedStatus = 'passed'): TestCase {
  return { id, title: id, expectedStatus, annotations: [{ type: 'flow', description: id }] } as TestCase
}
function result(status: TestResult['status']): TestResult {
  return { status, attachments: [{ name: 'flow-captures', contentType: 'application/json', body: Buffer.from(JSON.stringify({ flow: 'appearance', captures: [], capturedAt: 'now', testSha256: 'digest', outputDir: 'staged' })) }] } as TestResult
}
function run(status: FullResult['status']): FullResult { return { status } as FullResult }
function publication() {
  vi.spyOn(artifacts, 'checkFlowReferences').mockResolvedValue()
  return vi.spyOn(artifacts, 'publishFlow').mockResolvedValue()
}

it('does not publish failed, skipped, expected-failure or interrupted journeys', async () => {
  const publish = publication()
  for (const status of ['failed', 'skipped', 'timedOut', 'interrupted'] as const) {
    const reporter = new FlowReporter()
    reporter.onTestEnd(testCase(), result(status))
    await reporter.onEnd(run('failed'))
  }
  const expectedFailure = new FlowReporter()
  expectedFailure.onTestEnd(testCase('appearance', 'failed'), result('passed'))
  await expectedFailure.onEnd(run('failed'))
  const interrupted = new FlowReporter()
  interrupted.onTestEnd(testCase(), result('passed'))
  await interrupted.onEnd(run('interrupted'))
  expect(publish).not.toHaveBeenCalled()
})

it('uses the final retry result and publishes passing journeys in a partly failed suite', async () => {
  const publish = publication(), reporter = new FlowReporter()
  reporter.onTestEnd(testCase(), result('passed'))
  reporter.onTestEnd(testCase(), result('failed'))
  await reporter.onEnd(run('failed'))
  expect(publish).not.toHaveBeenCalled()
  reporter.onTestEnd(testCase(), result('passed'))
  await reporter.onEnd(run('failed'))
  expect(publish).toHaveBeenCalledOnce()
})

it('fails the run on publication errors while allowing other passing journeys to publish', async () => {
  const publish = publication(), reporter = new FlowReporter()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  publish.mockRejectedValueOnce(new Error('disk error'))
  reporter.onTestEnd(testCase(), result('passed'))
  const other = result('passed')
  other.attachments[0]!.body = Buffer.from(JSON.stringify({ flow: 'diagnostics', captures: [], outputDir: 'staged' }))
  reporter.onTestEnd(testCase('diagnostics'), other)
  expect(await reporter.onEnd(run('passed'))).toEqual({ status: 'failed' })
  expect(publish).toHaveBeenCalledTimes(2)
})
