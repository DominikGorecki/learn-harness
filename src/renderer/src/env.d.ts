import type { LearningApi } from '../../shared/contracts'
import type { AccountApi } from '../../shared/account'

declare global { interface Window { learning: LearningApi & AccountApi } }
