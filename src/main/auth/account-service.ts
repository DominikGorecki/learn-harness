import { ApplicationError } from '../../shared/contracts'
import { additionalAccountModels } from '../../shared/account'
import type { AccountSnapshot, AccountStatus, ModelChoice, AdditionalModelId } from '../../shared/account'
import { safeAccountError } from './provider-errors'
import { planScope } from './types'
import type { AccountCredential, AccountProvider, CredentialStore } from './types'
import type { AiCoordinator, AiLease } from '../../core/ai/coordinator'
import { observeNotification } from '../../core/notifications'

const failureStates: Partial<Record<string, AccountStatus>> = {
  AUTH_REQUIRED: 'reconnect-required', PLAN_PERMISSION_REQUIRED: 'permission-required', ACCESS_RESTRICTED: 'restricted', USAGE_LIMIT: 'usage-limited'
}

export class AccountService {
  private credential: AccountCredential | null = null
  private snapshot: AccountSnapshot
  private connection: AbortController | null = null
  private connectionTask: Promise<void> | null = null
  private authorizationUrl: string | null = null
  private refreshTask: Promise<void> | null = null
  private renewalTask: Promise<AccountCredential> | null = null
  private epoch = 0
  private disconnecting = false
  private modelTest: { lease: AiLease; target: AdditionalModelId; initial: AccountSnapshot } | null = null
  private modelTestTask: Promise<void> | null = null
  private verifiedModels = new Set<AdditionalModelId>()
  private listeners = new Set<(snapshot: AccountSnapshot) => void>()

  constructor(private readonly options: {
    provider: AccountProvider
    store: CredentialStore
    openBrowser(url: string): Promise<void>
    copyToClipboard(url: string): Promise<void>
    now?: () => number
    ai: AiCoordinator
    testModel(input: { target: AdditionalModelId; accessToken: string }, lease: AiLease): Promise<void>
  }) {
    this.snapshot = {
      status: 'disconnected', name: null, email: null, message: null,
      persistence: options.store.persistence, models: [], modelsStatus: 'idle', canReopenBrowser: false,
      modelTestStatus: 'idle', modelTestMessage: null, modelTestTarget: null, verifiedModelIds: []
    }
  }

  get(): AccountSnapshot { return structuredClone(this.snapshot) }
  subscribe(listener: (snapshot: AccountSnapshot) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private emit(): void { for (const listener of this.listeners) observeNotification(() => listener(this.get())) }
  private update(value: Partial<AccountSnapshot>): void { this.snapshot = { ...this.snapshot, ...value }; this.emit() }
  private idleGuard(): void {
    if (this.disconnecting) throw new ApplicationError('BUSY', 'Wait for sign-out to finish before connecting again.')
    if (this.options.ai.get().active) throw new ApplicationError('BUSY', 'Finish or cancel the AI action before changing your ChatGPT connection.')
  }
  /** Connection changes cannot race any inference admission. The coordinator owns inference contention. */
  assertCanStartOutline(): void {
    if (this.connection || this.disconnecting) throw new ApplicationError('BUSY', 'Finish updating the ChatGPT connection first.')
  }

  private connectedState(credential: AccountCredential): Partial<AccountSnapshot> {
    const permission = credential.scopes.includes(planScope) && Boolean(credential.accessToken)
    return { status: permission ? 'connected' : 'permission-required', name: credential.name, email: credential.email,
      message: permission ? null : 'You are signed in. Enable ChatGPT plan usage to create learning outlines.' }
  }

  async initialize(): Promise<void> {
    try {
      this.credential = await this.options.store.read()
      if (this.credential) {
        this.update(this.connectedState(this.credential))
        if (this.snapshot.status === 'connected') await this.refreshModels()
      }
    } catch { this.update({ status: 'reconnect-required', message: 'Your saved connection could not be opened. Reconnect ChatGPT to continue.' }) }
  }

  async connect(): Promise<AccountSnapshot> {
    this.idleGuard()
    if (this.connection) return this.get()
    if (this.refreshTask) await this.refreshTask
    this.idleGuard()
    if (this.connection) return this.get()
    const previous = this.credential
    const previousSnapshot = this.get()
    const controller = new AbortController()
    this.connection = controller
    this.update({ status: 'connecting', message: 'Complete sign-in in your browser.', canReopenBrowser: false })
    this.connectionTask = (async () => {
      let stored = false
      try {
        const hostId = await this.options.store.hostId()
        const credential = await this.options.provider.signIn({
          hostId, previous, signal: controller.signal,
          onAuthorizationUrl: async url => {
            controller.signal.throwIfAborted()
            this.authorizationUrl = url
            this.update({ canReopenBrowser: true })
            try { await this.options.openBrowser(url) }
            catch { if (this.connection === controller && !controller.signal.aborted) this.update({ message: 'The browser could not open automatically. Copy the sign-in link into your preferred browser, or try Open browser again.' }) }
          }
        })
        controller.signal.throwIfAborted()
        await this.options.store.write(credential)
        stored = true
        controller.signal.throwIfAborted()
        this.credential = credential
        this.epoch++
        this.verifiedModels.clear()
        this.update({ ...this.connectedState(credential), models: [], modelsStatus: 'idle', modelTestStatus: 'idle', modelTestMessage: null,
          modelTestTarget: null, verifiedModelIds: [] })
      } catch (error) {
        if (stored && controller.signal.aborted) {
          if (previous) await this.options.store.write(previous)
          else await this.options.store.clear()
        }
        const safe = safeAccountError(error)
        const failure: Partial<Record<string, AccountStatus>> = { AUTH_REQUIRED: 'reconnect-required', ACCESS_RESTRICTED: 'restricted', USAGE_LIMIT: 'usage-limited' }
        this.update({ ...previousSnapshot, ...(!previous && failure[safe.code] ? { status: failure[safe.code] } : {}), message: safe.message })
      } finally {
        this.connection = null
        this.authorizationUrl = null
        this.update({ canReopenBrowser: false })
      }
      if (this.snapshot.status === 'connected' && !controller.signal.aborted) await this.refreshModels()
    })().catch(() => {
      this.connection = null
      this.authorizationUrl = null
      this.update({ status: 'reconnect-required', canReopenBrowser: false, message: 'The connection could not be saved. Please reconnect.' })
    })
    return this.get()
  }

  async waitForConnection(): Promise<void> { await this.connectionTask }

  async cancel(): Promise<AccountSnapshot> {
    this.connection?.abort()
    await this.connectionTask
    return this.get()
  }

  async reopenBrowser(): Promise<AccountSnapshot> {
    if (!this.connection || !this.authorizationUrl) throw new ApplicationError('UNAVAILABLE', 'Start a new ChatGPT connection first.')
    try { await this.options.openBrowser(this.authorizationUrl) }
    catch { throw new ApplicationError('UNAVAILABLE', 'The browser could not be opened. Copy the sign-in link into your preferred browser.') }
    return this.get()
  }

  async copySignInLink(): Promise<AccountSnapshot> {
    const connection = this.connection
    const url = this.authorizationUrl
    if (!connection || connection.signal.aborted || !url) throw new ApplicationError('UNAVAILABLE', 'Start a new ChatGPT connection first.')
    try { await this.options.copyToClipboard(url) }
    catch { throw new ApplicationError('UNAVAILABLE', 'The sign-in link could not be copied. Try copying again or choose Open browser.') }
    if (this.connection === connection && !connection.signal.aborted && this.authorizationUrl === url) {
      this.update({ message: 'Sign-in link copied. Paste it into your preferred browser and keep this window open.' })
    }
    return this.get()
  }

  private async usableCredential(signal?: AbortSignal): Promise<AccountCredential> {
    signal?.throwIfAborted()
    if (!this.credential) throw new ApplicationError('AUTH_REQUIRED', 'Connect ChatGPT to create an outline.')
    if (!this.credential.scopes.includes(planScope)) throw new ApplicationError('PLAN_PERMISSION_REQUIRED', 'Enable ChatGPT plan usage to create an outline.')
    if (this.credential.expiresAt > (this.options.now ?? Date.now)() + 180_000 && this.credential.accessToken) return this.credential
    if (!this.renewalTask) {
      const original = this.credential
      const epoch = this.epoch
      // Rotation is a bounded account transaction: cancellation must not strand a
      // newly issued refresh token. The caller awaits this commit, then checks its lease.
      this.renewalTask = this.options.provider.renew(original, AbortSignal.timeout(30_000)).then(async renewed => {
        if (epoch !== this.epoch) throw new ApplicationError('CANCELLED', 'The account connection changed.')
        await this.options.store.write(renewed)
        this.credential = renewed
        this.update(this.connectedState(renewed))
        if (!renewed.scopes.includes(planScope) || !renewed.accessToken) throw new ApplicationError('PLAN_PERMISSION_REQUIRED', 'Enable ChatGPT plan usage to continue.')
        return renewed
      }).finally(() => { this.renewalTask = null })
    }
    return this.renewalTask
  }

  async refreshModels(owner?: AiLease): Promise<AccountSnapshot> {
    if (this.connection || this.disconnecting) return this.get()
    if (this.options.ai.get().active && (!owner || !this.options.ai.isOwner(owner))) return this.get()
    owner?.signal.throwIfAborted()
    if (this.refreshTask) { await this.refreshTask; return this.get() }
    const epoch = this.epoch
    this.update({ modelsStatus: 'loading' })
    this.refreshTask = (async () => {
      try {
        const credential = await this.usableCredential(owner?.signal)
        owner?.signal.throwIfAborted()
        const models = this.withAdditionalModels(await this.options.provider.listModels(credential, AbortSignal.any([AbortSignal.timeout(30_000), ...(owner ? [owner.signal] : [])])))
        owner?.signal.throwIfAborted()
        if (epoch === this.epoch) this.update({ ...this.connectedState(credential), models, modelsStatus: 'ready',
          message: models.length ? null : 'No models are currently available for this account. Try refreshing or reconnecting.' })
      } catch (error) {
        if (epoch === this.epoch && !owner?.signal.aborted) this.recordFailure(error)
      } finally { this.refreshTask = null }
    })()
    await this.refreshTask
    return this.get()
  }

  private withAdditionalModels(models: ModelChoice[]): ModelChoice[] {
    return [...models, ...additionalAccountModels.filter(extra => !models.some(model => model.id === extra.id)).map(model => ({ ...model }))]
  }

  testSolModel(): Promise<AccountSnapshot> { return this.testModel(additionalAccountModels[0]) }
  testLunaModel(): Promise<AccountSnapshot> { return this.testModel(additionalAccountModels[1]) }

  private async testModel(model: typeof additionalAccountModels[number]): Promise<AccountSnapshot> {
    this.assertCanStartOutline()
    const active = this.options.ai.get().active
    if (active) {
      const { lease, reused } = this.options.ai.claim({ kind: model.id === 'gpt-6.1-sol' ? 'test-sol' : 'test-luna', model,
        heading: `Testing ${model.name}`, requestSummary: 'Check access with a short reply.' })
      if (reused && this.modelTest?.lease === lease) return structuredClone(this.modelTest.initial)
      throw new ApplicationError('BUSY', 'Another AI action is still running.')
    }
    if (this.snapshot.status !== 'connected' || this.snapshot.modelsStatus !== 'ready' && !this.refreshTask) throw new ApplicationError('UNAVAILABLE', `Connect ChatGPT and refresh models before testing ${model.name}.`)
    if (this.verifiedModels.has(model.id)) return this.get()
    const { lease } = this.options.ai.claim({ kind: model.id === 'gpt-6.1-sol' ? 'test-sol' : 'test-luna', model,
      heading: `Testing ${model.name}`, requestSummary: 'Check access with a short reply.' })
    const epoch = this.epoch, signal = lease.signal
    let begin!: () => void
    const ready = new Promise<void>(resolve => { begin = resolve })
    const task = ready.then(async () => {
      let outcome: 'verified' | 'failed' | 'cancelled' = 'failed'
      let code: ApplicationError['code'] | undefined
      try {
        signal.throwIfAborted()
        if (this.refreshTask) await this.refreshTask
        signal.throwIfAborted()
        const credential = await this.usableCredential(signal)
        signal.throwIfAborted()
        if (!this.options.ai.isOwner(lease)) throw new ApplicationError('CANCELLED', 'The model test is no longer active.')
        await this.options.testModel({ target: model.id, accessToken: credential.accessToken! }, lease)
        signal.throwIfAborted()
        if (!this.options.ai.isOwner(lease)) throw new ApplicationError('CANCELLED', 'The model test is no longer active.')
        if (epoch !== this.epoch) return
        outcome = 'verified'
        this.verifiedModels.add(model.id)
        // Commit private/session state and release the cleaned-up owner before any
        // synchronous subscriber can cancel or start another diagnostic.
        this.snapshot = { ...this.snapshot, modelTestStatus: 'verified', verifiedModelIds: [...this.verifiedModels],
          modelTestMessage: `${model.name} replied successfully. Access is verified for this connection session.` }
        this.modelTest = null
        lease.settle('verified')
        this.emit()
      } catch (error) {
        if (epoch !== this.epoch || this.modelTest?.lease !== lease) return
        const safe = signal.aborted ? new ApplicationError('CANCELLED', 'Model test cancelled. Your available models have not changed.') : safeAccountError(error)
        code = safe.code; outcome = safe.code === 'CANCELLED' ? 'cancelled' : 'failed'
        const status = signal.aborted ? undefined : failureStates[safe.code]
        this.snapshot = { ...this.snapshot, ...(status ? { status } : {}), modelTestStatus: outcome === 'cancelled' ? 'idle' : 'failed', modelTestMessage: safe.message }
        this.modelTest = null
        lease.settle(outcome, code)
        this.emit()
      } finally {
        if (this.modelTest?.lease === lease) this.modelTest = null
        lease.settle(outcome, code)
      }
    })
    lease.setCancellation(() => task)
    const initial = { ...this.get(), modelTestStatus: 'testing' as const, modelTestTarget: model.id, modelTestMessage: `Testing ${model.name} with a short reply…` }
    this.modelTest = { lease, target: model.id, initial }
    this.modelTestTask = task
    begin(); this.update(initial)
    return structuredClone(initial)
  }

  async cancelModelTest(): Promise<AccountSnapshot> {
    const lease = this.modelTest?.lease
    if (lease && this.options.ai.isOwner(lease)) await this.options.ai.cancel({ operationId: lease.operationId })
    return this.get()
  }

  async waitForModelTest(): Promise<void> { await this.modelTestTask }

  recordFailure(error: unknown): void {
    const safe = safeAccountError(error)
    this.update({ status: failureStates[safe.code] ?? this.snapshot.status, modelsStatus: 'failed', message: safe.message })
  }

  /** Privileged worker credential, deliberately excluded from every public snapshot. */
  async authorizeModel(modelId: string, owner?: AiLease): Promise<{ accessToken: string; model: { id: string; name: string } }> {
    const guard = () => {
      owner?.signal.throwIfAborted()
      this.assertCanStartOutline()
      if (this.options.ai.get().active && (!owner || !this.options.ai.isOwner(owner))) throw new ApplicationError('BUSY', 'Another AI action owns the connection.')
      if (owner && !this.options.ai.isOwner(owner)) throw new ApplicationError('CANCELLED', 'This AI action is no longer active.')
    }
    guard()
    try {
      const credential = await this.usableCredential(owner?.signal)
      guard()
      if (this.snapshot.modelsStatus !== 'ready') await this.refreshModels(owner)
      guard()
      const model = this.snapshot.models.find(model => model.id === modelId)
      if (!model || this.snapshot.modelsStatus !== 'ready') throw new ApplicationError('UNAVAILABLE', 'Refresh models and choose an available model before creating an outline.')
      return { accessToken: credential.accessToken!, model: { ...model } }
    } catch (error) {
      if (owner?.signal.aborted) throw new ApplicationError('CANCELLED', 'AI work cancelled. Your connection is unchanged.')
      const safe = safeAccountError(error)
      if (safe.code !== 'CANCELLED' && safe.code !== 'BUSY') this.recordFailure(safe)
      throw safe
    }
  }

  async disconnect(): Promise<AccountSnapshot> {
    this.idleGuard()
    this.disconnecting = true
    try {
      await this.cancel()
      if (this.refreshTask) await this.refreshTask
      if (this.renewalTask) await this.renewalTask.catch(() => {})
      const credential = this.credential
      this.epoch++
      let revoked = true
      if (credential) {
        try { await this.options.provider.revoke(credential, AbortSignal.timeout(10_000)) }
        catch { revoked = false }
      }
      await this.options.store.clear()
      this.credential = null
      this.verifiedModels.clear()
      this.update({ status: 'disconnected', name: null, email: null, models: [], modelsStatus: 'idle',
        modelTestStatus: 'idle', modelTestMessage: null, modelTestTarget: null, verifiedModelIds: [],
        message: revoked ? null : 'Signed out here. To remove the remote connection too, disconnect Learning Studio in ChatGPT settings.' })
      return this.get()
    } finally {
      this.disconnecting = false
    }
  }

  async dispose(): Promise<void> {
    const lease = this.modelTest?.lease
    if (lease && this.options.ai.isOwner(lease)) await this.options.ai.cancel({ operationId: lease.operationId })
    await this.modelTestTask
    if (this.renewalTask) await this.renewalTask.catch(() => {})
    this.epoch++; this.connection?.abort(); this.listeners.clear()
  }
}
