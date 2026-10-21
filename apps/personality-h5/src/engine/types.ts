/** 正分一端。两套题必须共用同一套 id 和正负方向，后面的话题才能叠加上去。 */
export type Dimension = {
  id: string;
  name: string;
  lowLabel: string;
  highLabel: string;
  lowSentence: string;
  highSentence: string;
  midSentence: string;
};

export type Choice = {
  id: string;
  text: string;
  weights: Record<string, number>;
};

export type Question = {
  id: string;
  prompt: string;
  choices: Choice[];
};

export type Archetype = {
  id: string;
  name: string;
  summary: string;
  shareLine: string;
  /** axis 模式：每个维度落在哪一端。 */
  poles?: Record<string, "low" | "high">;
  /** nearest 模式：与作答向量比方向。分量大约在 -1 到 1。 */
  vector?: Record<string, number>;
};

export type BalancedCopy = {
  title: string;
  summary: string;
  shareLine: string;
};

export type TestPack = {
  version: 1;
  id: string;
  title: string;
  topic: string;
  scenario: string;
  intro: string;
  mode: "axis" | "nearest";
  balanced: BalancedCopy;
  dimensions: Dimension[];
  questions: Question[];
  archetypes: Archetype[];
};

export type TraitVector = Record<string, number>;

export type Lean = "low" | "high" | "mid";

export type DimensionReading = {
  id: string;
  name: string;
  lowLabel: string;
  highLabel: string;
  raw: number;
  normalized: number;
  lean: Lean;
  sentence: string;
};

export type TestResult = {
  packId: string;
  readings: DimensionReading[];
  polesLabel: string;
  archetypeId: string | null;
  similarity: number | null;
  title: string;
  summary: string;
  shareLine: string;
};

export type Session =
  | { phase: "home" }
  | { phase: "intro"; packId: string }
  | { phase: "question"; packId: string; index: number; answers: Record<string, string> }
  | { phase: "result"; packId: string; answers: Record<string, string> };

/**
 * 以后的话题镜头。强调系数乘在归一化向量上，再做最近原型匹配。
 * 例如亲密关系加重「冲突」，共事加重「节奏」和「判断」。
 */
export type TopicLens = {
  id: string;
  topic: string;
  scenario: string;
  emphasis: Record<string, number>;
};

/**
 * 综艺人物卡先不进题库。和原型用同一套维度向量，就可以问「气质接近谁」。
 * 关系是边，不是人物身上的一个分数。
 */
export type CharacterCard = {
  id: string;
  name: string;
  reading: string;
  vector: TraitVector;
  experiences: string[];
  relations: { to: string; kind: string; note: string }[];
};
