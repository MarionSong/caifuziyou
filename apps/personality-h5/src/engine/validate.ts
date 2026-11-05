import { TestEngineError } from "./errors";
import type { Archetype, Choice, Dimension, Question, TestPack } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TestEngineError(`${label}不能为空。`);
  }
  return value;
}

function uniqueIds(ids: string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new TestEngineError(`${label} id 重复：${id}`);
    seen.add(id);
  }
}

function readDimension(raw: unknown): Dimension {
  if (!isRecord(raw)) throw new TestEngineError("维度格式不对。");
  return {
    id: requiredString(raw.id, "维度 id"),
    name: requiredString(raw.name, "维度名称"),
    lowLabel: requiredString(raw.lowLabel, "维度低端文案"),
    highLabel: requiredString(raw.highLabel, "维度高端文案"),
    lowSentence: requiredString(raw.lowSentence, "维度低端解释"),
    highSentence: requiredString(raw.highSentence, "维度高端解释"),
    midSentence: requiredString(raw.midSentence, "维度居中解释"),
  };
}

function readChoice(raw: unknown, dimensionIds: ReadonlySet<string>): Choice {
  if (!isRecord(raw)) throw new TestEngineError("选项格式不对。");
  if (!isRecord(raw.weights)) throw new TestEngineError("选项缺少权重。");
  const weights: Record<string, number> = {};
  for (const [dimensionId, weight] of Object.entries(raw.weights)) {
    if (!dimensionIds.has(dimensionId)) {
      throw new TestEngineError(`选项引用了未知维度：${dimensionId}`);
    }
    if (typeof weight !== "number" || !Number.isFinite(weight)) {
      throw new TestEngineError("权重必须是有限数字。");
    }
    weights[dimensionId] = weight;
  }
  if (Object.keys(weights).length === 0) {
    throw new TestEngineError("每个选项至少要影响一个维度。");
  }
  return {
    id: requiredString(raw.id, "选项 id"),
    text: requiredString(raw.text, "选项文案"),
    weights,
  };
}

function readQuestion(raw: unknown, dimensionIds: ReadonlySet<string>): Question {
  if (!isRecord(raw) || !Array.isArray(raw.choices)) {
    throw new TestEngineError("题目格式不对。");
  }
  if (raw.choices.length < 2) throw new TestEngineError("每道题至少两个选项。");
  const choices = raw.choices.map((choice) => readChoice(choice, dimensionIds));
  uniqueIds(
    choices.map((choice) => choice.id),
    "选项",
  );
  return {
    id: requiredString(raw.id, "题目 id"),
    prompt: requiredString(raw.prompt, "题干"),
    choices,
  };
}

function readArchetype(raw: unknown, packMode: TestPack["mode"], dimensionIds: readonly string[]): Archetype {
  if (!isRecord(raw)) throw new TestEngineError("原型格式不对。");
  const archetype: Archetype = {
    id: requiredString(raw.id, "原型 id"),
    name: requiredString(raw.name, "原型名称"),
    summary: requiredString(raw.summary, "原型解释"),
    shareLine: requiredString(raw.shareLine, "转发文案"),
  };
  if (packMode === "axis") {
    if (!isRecord(raw.poles)) throw new TestEngineError(`原型 ${archetype.id} 缺少两端组合。`);
    const poles: Record<string, "low" | "high"> = {};
    for (const dimensionId of dimensionIds) {
      const pole = raw.poles[dimensionId];
      if (pole !== "low" && pole !== "high") {
        throw new TestEngineError(`原型 ${archetype.id} 的 ${dimensionId} 必须是 low 或 high。`);
      }
      poles[dimensionId] = pole;
    }
    archetype.poles = poles;
    return archetype;
  }
  if (!isRecord(raw.vector)) throw new TestEngineError(`原型 ${archetype.id} 缺少向量。`);
  const vector: Record<string, number> = {};
  for (const dimensionId of dimensionIds) {
    const value = raw.vector[dimensionId];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TestEngineError(`原型 ${archetype.id} 的 ${dimensionId} 向量无效。`);
    }
    vector[dimensionId] = value;
  }
  archetype.vector = vector;
  return archetype;
}

export function validatePack(raw: unknown): TestPack {
  if (!isRecord(raw)) throw new TestEngineError("题库格式不对。");
  if (raw.version !== 1) throw new TestEngineError("题库版本不是 1。");
  if (raw.mode !== "axis" && raw.mode !== "nearest") {
    throw new TestEngineError("题库模式必须是 axis 或 nearest。");
  }
  const mode = raw.mode;
  if (!Array.isArray(raw.dimensions) || raw.dimensions.length === 0) {
    throw new TestEngineError("题库至少要有一个维度。");
  }
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw new TestEngineError("题库至少要有一道题。");
  }
  if (!Array.isArray(raw.archetypes) || raw.archetypes.length === 0) {
    throw new TestEngineError("题库至少要有一个原型。");
  }
  if (!isRecord(raw.balanced)) throw new TestEngineError("题库缺少打平文案。");

  const dimensions = raw.dimensions.map(readDimension);
  uniqueIds(
    dimensions.map((dimension) => dimension.id),
    "维度",
  );
  const dimensionIds = dimensions.map((dimension) => dimension.id);
  const dimensionIdSet = new Set(dimensionIds);
  const questions = raw.questions.map((question) => readQuestion(question, dimensionIdSet));
  uniqueIds(
    questions.map((question) => question.id),
    "题目",
  );
  const archetypes = raw.archetypes.map((archetype) => readArchetype(archetype, mode, dimensionIds));
  uniqueIds(
    archetypes.map((archetype) => archetype.id),
    "原型",
  );

  if (mode === "axis") {
    const signatures = new Set<string>();
    for (const archetype of archetypes) {
      const signature = dimensionIds.map((id) => archetype.poles?.[id]).join("/");
      if (signatures.has(signature)) {
        throw new TestEngineError(`有两个原型落在同一组两端：${archetype.name}`);
      }
      signatures.add(signature);
    }
  }

  return {
    version: 1,
    id: requiredString(raw.id, "题库 id"),
    title: requiredString(raw.title, "题库标题"),
    topic: requiredString(raw.topic, "话题"),
    scenario: requiredString(raw.scenario, "场景"),
    intro: requiredString(raw.intro, "开场白"),
    mode,
    balanced: {
      title: requiredString(raw.balanced.title, "打平标题"),
      summary: requiredString(raw.balanced.summary, "打平解释"),
      shareLine: requiredString(raw.balanced.shareLine, "打平转发文案"),
    },
    dimensions,
    questions,
    archetypes,
  };
}
