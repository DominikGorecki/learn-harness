import type { ApiResult } from '../../../shared/contracts'

export async function request<T>(result: Promise<ApiResult<T>>): Promise<T> {
  const response = await result
  if (!response.ok) throw new Error(response.error.message)
  return response.data
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
