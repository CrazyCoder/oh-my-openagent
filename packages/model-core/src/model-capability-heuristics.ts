import { normalizeModelID } from "./model-normalization"
import { parseVariantFromModelID } from "./model-string-parser"

export type HeuristicModelFamilyDefinition = {
  family: string
  includes?: string[]
  pattern?: RegExp
  variants?: string[]
  reasoningEfforts?: string[]
  reasoningEffortAliases?: Record<string, string>
  supportsTemperature?: boolean
  supportsThinking?: boolean
  thinkingMode?: "adaptive-only"
}

export const HEURISTIC_MODEL_FAMILY_REGISTRY: ReadonlyArray<HeuristicModelFamilyDefinition> = [
  // Claude 5 family (Fable/Mythos 5, Opus 5+, Sonnet 5+). These must precede the
  // 4.x entries: the 4.x patterns pin a literal `-4-`, so a 5-series ID would
  // otherwise fall through to the generic `claude` catch-all and be capped at
  // `high`. All three take the full low..max ladder, and all three removed
  // `budget_tokens` (a manual thinking config is a 400), hence adaptive-only.
  //
  // The version segment is `(?:[5-9]|\d{2})(?!\d)` — a single 5-9, or exactly
  // two digits, in both cases not followed by more digits. A bare `\d{2,}`
  // would swallow the date in legacy snapshot IDs like `claude-3-opus-20240229`
  // and wrongly grant Opus 3 the full ladder. The trailing `(?!\d)` still
  // permits a dated 5-series ID (`claude-opus-5-20260724`) and future
  // two-digit majors (`claude-opus-10`).
  {
    family: "claude-fable-mythos-5",
    pattern: /claude-(?:fable|mythos)-(?:[5-9]|\d{2})(?!\d)/,
    variants: ["low", "medium", "high", "xhigh", "max"],
    supportsThinking: true,
    thinkingMode: "adaptive-only",
  },
  {
    family: "claude-opus-5-plus",
    pattern: /claude(?:-\d+(?:-\d+)*)?-opus-(?:[5-9]|\d{2})(?!\d)/,
    variants: ["low", "medium", "high", "xhigh", "max"],
    supportsThinking: true,
    thinkingMode: "adaptive-only",
  },
  {
    family: "claude-sonnet-5-plus",
    pattern: /claude(?:-\d+(?:-\d+)*)?-sonnet-(?:[5-9]|\d{2})(?!\d)/,
    variants: ["low", "medium", "high", "xhigh", "max"],
    supportsThinking: true,
    thinkingMode: "adaptive-only",
  },
  {
    family: "claude-opus-4-7-plus",
    pattern: /claude(?:-\d+(?:-\d+)*)?-opus-4-(?:[7-9]|\d{2,})/,
    variants: ["low", "medium", "high", "xhigh", "max"],
    supportsThinking: true,
    thinkingMode: "adaptive-only",
  },
  {
    family: "claude-opus-4-6",
    pattern: /claude(?:-\d+(?:-\d+)*)?-opus-4-6/,
    variants: ["low", "medium", "high", "max"],
    supportsThinking: true,
  },
  {
    family: "claude-sonnet-4-6-plus",
    pattern: /claude(?:-\d+(?:-\d+)*)?-sonnet-4-(?:[6-9]|\d{2,})/,
    variants: ["low", "medium", "high", "max"],
    supportsThinking: true,
  },
  {
    family: "claude",
    includes: ["claude"],
    variants: ["low", "medium", "high"],
    supportsThinking: true,
  },
  {
    family: "openai-deep-research",
    includes: ["o3-deep-research", "o4-mini-deep-research"],
    variants: ["low", "medium", "high"],
    reasoningEfforts: ["none", "minimal", "low", "medium", "high"],
    supportsTemperature: true,
  },
  {
    family: "openai-reasoning",
    pattern: /(?:^|\/)o\d(?:$|-)/,
    variants: ["low", "medium", "high"],
    reasoningEfforts: ["none", "minimal", "low", "medium", "high"],
    supportsTemperature: false,
  },
  {
    family: "gpt-5",
    includes: ["gpt-5"],
    variants: ["low", "medium", "high", "xhigh"],
    reasoningEfforts: ["none", "minimal", "low", "medium", "high", "xhigh", "max"],
  },
  {
    family: "gpt-legacy",
    includes: ["gpt"],
    variants: ["low", "medium", "high"],
  },
  {
    family: "gemini",
    includes: ["gemini"],
    variants: ["low", "medium", "high"],
  },
  {
    family: "qwen",
    includes: ["qwen"],
  },
  {
    family: "grok",
    includes: ["grok"],
    variants: ["low", "medium", "high"],
    reasoningEfforts: ["low", "medium", "high"],
  },
  {
    family: "kimi-thinking",
    includes: ["kimi-thinking", "k2-thinking", "k2-think"],
    // Matches models with -thinking/-think suffix, OR k2p* models (k2p5, k2p6, k2-p6, k2.p6)
    // which are kimi-for-coding provider models that support thinking (#3945, #4418, #4707).
    pattern: /(?:kimi.*-(?:thinking|think)|k2(?:.*-(?:thinking|think)|[-.]?p\d))/,
    variants: ["low", "medium", "high"],
    supportsThinking: true,
  },
  {
    family: "kimi",
    // Match "kimi" anywhere, or "k2" NOT followed by optional separator + "p" + digit.
    // Excludes k2p6, k2-p6, k2.p6 from kimi-for-coding which support thinking (#4418).
    pattern: /(?:kimi|k2(?![-.]?p\d))/,
    variants: ["low", "medium", "high"],
    supportsThinking: false,
  },
  {
    family: "glm",
    includes: ["glm"],
    variants: ["low", "medium", "high", "max"],
    reasoningEfforts: ["high", "max"],
    reasoningEffortAliases: {
      low: "high",
      medium: "high",
      xhigh: "max",
    },
  },
  {
    family: "minimax",
    includes: ["minimax"],
    variants: ["low", "medium", "high"],
    supportsThinking: false,
  },
  {
    family: "deepseek",
    includes: ["deepseek"],
    variants: ["low", "medium", "high", "max"],
    reasoningEfforts: ["high", "max"],
    reasoningEffortAliases: {
      low: "high",
      medium: "high",
      xhigh: "max",
    },
  },
  {
    family: "mistral",
    includes: ["mistral", "codestral"],
    variants: ["low", "medium", "high"],
  },
  {
    family: "llama",
    includes: ["llama"],
    variants: ["low", "medium", "high"],
  },
]

export function detectHeuristicModelFamily(modelID: string): HeuristicModelFamilyDefinition | undefined {
  const parsedModel = parseVariantFromModelID(modelID, { allowMaxSuffix: true })
  const normalizedModelID = normalizeModelID(parsedModel.modelID).toLowerCase()

  for (const definition of HEURISTIC_MODEL_FAMILY_REGISTRY) {
    if (definition.pattern?.test(normalizedModelID)) {
      return definition
    }

    if (definition.includes?.some((value) => normalizedModelID.includes(value))) {
      return definition
    }
  }

  return undefined
}
