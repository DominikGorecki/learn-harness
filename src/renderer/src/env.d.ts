import type { AccountApi } from '../../shared/account'
import type { WorkspaceApi } from '../../shared/workspace'
import type { GenerationApi } from '../../shared/generation'

declare global { interface Window { learning: AccountApi & WorkspaceApi & GenerationApi } }
