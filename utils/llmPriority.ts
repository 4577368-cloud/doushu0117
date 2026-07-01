export type LlmPriority = 1 | 2 | 3;

export function parseLlmPriorityFromResponse(response: Response): LlmPriority | null {
  const raw = response.headers.get('X-LLM-Priority');
  const n = raw ? parseInt(raw, 10) : NaN;
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

export function notifyLlmPriority(
  response: Response,
  onLlmPriority?: (priority: LlmPriority) => void
) {
  const priority = parseLlmPriorityFromResponse(response);
  if (priority && onLlmPriority) onLlmPriority(priority);
}
