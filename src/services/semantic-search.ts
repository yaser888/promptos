/**
 * Semantic Search bus.
 *
 * The library route opt-in via `?semantic=true`. Keyword search remains the
 * default; when a semantic provider is registered and available, its ranked
 * results replace keyword matching entirely (the given prompt ids are then
 * filtered/sorted/paginated by the regular pipeline).
 *
 * To plug a real embeddings provider later (pgvector, OpenAI, local ONNX…):
 *   1. implement SemanticSearchProvider
 *   2. call registerSemanticProvider(...) from instrumentation or middleware
 *   3. done — no other code changes needed
 */

export interface SemanticSearchProvider {
  readonly id: string;
  isAvailable(): boolean | Promise<boolean>;
  search(
    query: string,
    opts?: { limit?: number; userId?: string }
  ): Promise<string[] | null>;
}

const providers: SemanticSearchProvider[] = [];

export function registerSemanticProvider(provider: SemanticSearchProvider) {
  if (!providers.some((p) => p.id === provider.id)) {
    providers.push(provider);
  }
}

export async function runSemanticSearch(
  query: string,
  opts?: { limit?: number; userId?: string }
): Promise<string[] | null> {
  if (!process.env.SEMANTIC_SEARCH_ENABLED) return null;
  for (const provider of providers) {
    try {
      if (await provider.isAvailable()) {
        const ids = await provider.search(query, opts);
        if (ids && ids.length) return ids;
      }
    } catch {
      // provider failure — try the next one, else fall back to keyword
    }
  }
  return null;
}