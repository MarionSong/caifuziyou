import { TestEngineError } from "./errors";
import type {
  DimensionReading,
  Lean,
  TestPack,
  TestResult,
  TraitVector,
} from "./types";

export function scoreAnswers(pack: TestPack, answers: Readonly<Record<string, string>>): TraitVector {
  const raw: TraitVector = {};
  for (const dimension of pack.dimensions) raw[dimension.id] = 0;

  const missing = pack.questions.some((question) => typeof answers[question.id] !== "string");
  if (missing) throw new TestEngineError("还有题目没有答案，不能出结果。");

  for (const question of pack.questions) {
    const choice = question.choices.find((item) => item.id === answers[question.id]);
    if (!choice) throw new TestEngineError("有答案对不上选项。");
    for (const [dimensionId, weight] of Object.entries(choice.weights)) {
      if (!(dimensionId in raw) || !Number.isFinite(weight)) {
        throw new TestEngineError("答案里有无法计分的权重。");
      }
      raw[dimensionId] += weight;
    }
  }
  return raw;
}

function maxAbs(pack: TestPack, dimensionId: string): number {
  let total = 0;
  for (const question of pack.questions) {
    let peak = 0;
    for (const choice of question.choices) {
      peak = Math.max(peak, Math.abs(choice.weights[dimensionId] ?? 0));
    }
    total += peak;
  }
  return total || 1;
}

/** 把原始分收成大约 -1 到 1，方便和原型、人物卡放在同一套坐标里。 */
export function normalizeVector(pack: TestPack, raw: TraitVector): TraitVector {
  const normalized: TraitVector = {};
  for (const dimension of pack.dimensions) {
    normalized[dimension.id] = (raw[dimension.id] ?? 0) / maxAbs(pack, dimension.id);
  }
  return normalized;
}

export function emphasize(
  vector: TraitVector,
  emphasis: Readonly<Record<string, number>>,
): TraitVector {
  for (const [dimensionId, factor] of Object.entries(emphasis)) {
    if (!Number.isFinite(factor)) throw new TestEngineError("镜头权重无效。");
    if (!(dimensionId in vector)) throw new TestEngineError(`镜头里有未知维度：${dimensionId}`);
  }
  const next: TraitVector = {};
  for (const [dimensionId, value] of Object.entries(vector)) {
    next[dimensionId] = value * (emphasis[dimensionId] ?? 1);
  }
  return next;
}

export type VectorCandidate = {
  id: string;
  vector: Readonly<Record<string, number>>;
};

function cosine(left: TraitVector, right: Readonly<Record<string, number>>, dimensionIds: readonly string[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const dimensionId of dimensionIds) {
    const x = left[dimensionId] ?? 0;
    const y = right[dimensionId] ?? 0;
    dot += x * y;
    leftNorm += x * x;
    rightNorm += y * y;
  }
  if (leftNorm < 1e-12 || rightNorm < 1e-12) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

/** 方向最接近的候选。向量接近 0 时返回 null，不硬套第一个原型。同分保留更靠前的候选。 */
export function nearestCandidate(
  dimensionIds: readonly string[],
  vector: TraitVector,
  candidates: readonly VectorCandidate[],
): { id: string; similarity: number } | null {
  const magnitude = Math.sqrt(dimensionIds.reduce((sum, id) => sum + (vector[id] ?? 0) ** 2, 0));
  if (magnitude < 1e-9 || candidates.length === 0) return null;
  let best: { id: string; similarity: number } | null = null;
  for (const candidate of candidates) {
    const similarity = cosine(vector, candidate.vector, dimensionIds);
    if (!best || similarity > best.similarity + 1e-12) {
      best = { id: candidate.id, similarity };
    }
  }
  return best;
}

function leanOf(normalized: number): Lean {
  if (Math.abs(normalized) < 1e-9) return "mid";
  return normalized > 0 ? "high" : "low";
}

function sentenceFor(dimension: TestPack["dimensions"][number], lean: Lean): string {
  if (lean === "high") return dimension.highSentence;
  if (lean === "low") return dimension.lowSentence;
  return dimension.midSentence;
}

function poleWord(reading: DimensionReading): string {
  if (reading.lean === "mid") return "两边接近";
  return reading.lean === "high" ? reading.highLabel : reading.lowLabel;
}

export function resolveResult(
  pack: TestPack,
  answers: Readonly<Record<string, string>>,
  emphasis?: Readonly<Record<string, number>>,
): TestResult {
  const raw = scoreAnswers(pack, answers);
  const normalized = emphasis ? emphasize(normalizeVector(pack, raw), emphasis) : normalizeVector(pack, raw);
  const readings: DimensionReading[] = pack.dimensions.map((dimension) => {
    const lean = leanOf(normalized[dimension.id] ?? 0);
    return {
      id: dimension.id,
      name: dimension.name,
      lowLabel: dimension.lowLabel,
      highLabel: dimension.highLabel,
      raw: raw[dimension.id] ?? 0,
      normalized: normalized[dimension.id] ?? 0,
      lean,
      sentence: sentenceFor(dimension, lean),
    };
  });
  const polesLabel = readings.map(poleWord).join(" · ");
  const allMid = readings.every((reading) => reading.lean === "mid");

  if (pack.mode === "nearest") {
    const match = nearestCandidate(
      pack.dimensions.map((dimension) => dimension.id),
      normalized,
      pack.archetypes.map((archetype) => ({ id: archetype.id, vector: archetype.vector ?? {} })),
    );
    if (!match) {
      return {
        packId: pack.id,
        readings,
        polesLabel,
        archetypeId: null,
        similarity: null,
        title: pack.balanced.title,
        summary: pack.balanced.summary,
        shareLine: pack.balanced.shareLine,
      };
    }
    const archetype = pack.archetypes.find((item) => item.id === match.id);
    if (!archetype) throw new TestEngineError("匹配到了不存在的原型。");
    return {
      packId: pack.id,
      readings,
      polesLabel,
      archetypeId: archetype.id,
      similarity: match.similarity,
      title: archetype.name,
      summary: archetype.summary,
      shareLine: archetype.shareLine,
    };
  }

  if (allMid || readings.some((reading) => reading.lean === "mid")) {
    return {
      packId: pack.id,
      readings,
      polesLabel,
      archetypeId: null,
      similarity: null,
      title: allMid ? pack.balanced.title : polesLabel,
      summary: pack.balanced.summary,
      shareLine: pack.balanced.shareLine,
    };
  }

  const archetype = pack.archetypes.find((item) =>
    readings.every((reading) => item.poles?.[reading.id] === reading.lean),
  );
  if (!archetype) {
    return {
      packId: pack.id,
      readings,
      polesLabel,
      archetypeId: null,
      similarity: null,
      title: polesLabel,
      summary: readings.map((reading) => reading.sentence).join(""),
      shareLine: pack.balanced.shareLine,
    };
  }
  return {
    packId: pack.id,
    readings,
    polesLabel,
    archetypeId: archetype.id,
    similarity: null,
    title: archetype.name,
    summary: archetype.summary,
    shareLine: archetype.shareLine,
  };
}
