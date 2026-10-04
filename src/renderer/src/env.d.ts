import type { AccountApi } from '../../shared/account'
import type { WorkspaceApi } from '../../shared/workspace'

declare global { interface Window { learning: AccountApi & WorkspaceApi } }
