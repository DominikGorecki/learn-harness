import type { AccountApi } from '../../shared/account'
import type { WorkspaceApi } from '../../shared/workspace'
import type { GenerationApi } from '../../shared/generation'
import type { AiApi } from '../../shared/ai/activity'
import type { ApplicationMenuApi } from '../../shared/application-menu'

import type { TopicChapterApi } from '../../shared/topic-content'
import type { OpenRouterApi } from '../../shared/openrouter'
declare global { interface Window { learning: AccountApi & WorkspaceApi & GenerationApi & AiApi & ApplicationMenuApi & TopicChapterApi & OpenRouterApi } }
