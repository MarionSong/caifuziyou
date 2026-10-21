export { TestEngineError } from "./errors";
export { emphasize, nearestCandidate, normalizeVector, resolveResult, scoreAnswers } from "./score";
export type { VectorCandidate } from "./score";
export { back, begin, choose, HOME, openPack, restoreSession, retry } from "./session";
export type {
  Archetype,
  CharacterCard,
  Choice,
  Dimension,
  DimensionReading,
  Lean,
  Question,
  Session,
  TestPack,
  TestResult,
  TopicLens,
  TraitVector,
} from "./types";
export { validatePack } from "./validate";
