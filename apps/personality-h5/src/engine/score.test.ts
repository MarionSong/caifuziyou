import { describe, expect, it } from "vitest";
import { packs } from "../content/registry";
import { TestEngineError } from "./errors";
import { emphasize, nearestCandidate, resolveResult } from "./score";
import type { TestPack } from "./types";
import { validatePack } from "./validate";

const daily = packs[0];
const relationship = packs[1];

function answersToward(pack: TestPack, sign: 1 | -1): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const question of pack.questions) {
    const choice = question.choices.find((item) =>
      Object.values(item.weights).some((weight) => Math.sign(weight) === sign),
    );
    if (!choice) throw new Error(`题目 ${question.id} 没有 ${sign} 方向的选项`);
    answers[question.id] = choice.id;
  }
  return answers;
}

const cancelPack: TestPack = {
  version: 1,
  id: "cancel",
  title: "抵消",
  topic: "测试",
  scenario: "测试",
  intro: "测试",
  mode: "axis",
  balanced: { title: "还看不出来倒向", summary: "选择抵消了。", shareLine: "几乎打平。" },
  dimensions: [
    {
      id: "express",
      name: "表达",
      lowLabel: "先想",
      highLabel: "先说",
      lowSentence: "低",
      highSentence: "高",
      midSentence: "中",
    },
  ],
  questions: [
    {
      id: "q1",
      prompt: "一",
      choices: [
        { id: "a", text: "正", weights: { express: 2 } },
        { id: "b", text: "负", weights: { express: -2 } },
      ],
    },
    {
      id: "q2",
      prompt: "二",
      choices: [
        { id: "a", text: "正", weights: { express: 2 } },
        { id: "b", text: "负", weights: { express: -2 } },
      ],
    },
  ],
  archetypes: [
    {
      id: "high",
      name: "高型",
      summary: "高",
      shareLine: "高",
      poles: { express: "high" },
    },
    {
      id: "low",
      name: "低型",
      summary: "低",
      shareLine: "低",
      poles: { express: "low" },
    },
  ],
};

describe("题库", () => {
  it("两套题共用同一套坐标方向", () => {
    expect(relationship.dimensions.map((dimension) => [dimension.id, dimension.highLabel, dimension.lowLabel])).toEqual(
      daily.dimensions.map((dimension) => [dimension.id, dimension.highLabel, dimension.lowLabel]),
    );
    expect(daily.questions).toHaveLength(12);
    expect(relationship.questions).toHaveLength(12);
    expect(daily.mode).toBe("axis");
    expect(relationship.mode).toBe("nearest");
  });

  it("日常四轴覆盖全部 16 种组合", () => {
    const signatures = new Set(
      daily.archetypes.map((archetype) => daily.dimensions.map((dimension) => archetype.poles?.[dimension.id]).join("/")),
    );
    expect(signatures.size).toBe(16);
  });
});

describe("计分", () => {
  it("全选正分一端得到点火人", () => {
    const result = resolveResult(daily, answersToward(daily, 1));
    expect(result.archetypeId).toBe("spark");
    expect(result.title).toBe("点火人");
    expect(result.readings.every((reading) => reading.lean === "high" && reading.normalized === 1)).toBe(true);
    expect(result.polesLabel).toBe("先说 · 看人 · 边做 · 直说");
  });

  it("全选负分一端得到压舱石", () => {
    const result = resolveResult(daily, answersToward(daily, -1));
    expect(result.archetypeId).toBe("ballast");
    expect(result.readings.every((reading) => reading.lean === "low" && reading.normalized === -1)).toBe(true);
  });

  it("权重抵消时停在中间，不硬套类型", () => {
    const result = resolveResult(cancelPack, { q1: "a", q2: "b" });
    expect(result.archetypeId).toBeNull();
    expect(result.readings[0]?.lean).toBe("mid");
    expect(result.readings[0]?.sentence).toBe("中");
    expect(result.title).toBe("还看不出来倒向");
  });

  it("空答或坏选项不能出结果", () => {
    expect(() => resolveResult(daily, {})).toThrow(TestEngineError);
    expect(() => resolveResult(cancelPack, { q1: "a" })).toThrow(/没有答案/);
    expect(() => resolveResult(cancelPack, { q1: "z", q2: "a" })).toThrow(/对不上选项/);
  });

  it("坏权重不能计分", () => {
    const broken: TestPack = {
      ...cancelPack,
      questions: [
        {
          id: "q1",
          prompt: "一",
          choices: [
            { id: "a", text: "坏", weights: { nope: 1 } },
            { id: "b", text: "负", weights: { express: -2 } },
          ],
        },
      ],
    };
    expect(() => resolveResult(broken, { q1: "a" })).toThrow(/无法计分/);
  });

  it("相处角色全正分接近带动者，全负分接近观察者", () => {
    const outward = resolveResult(relationship, answersToward(relationship, 1));
    const inward = resolveResult(relationship, answersToward(relationship, -1));
    expect(outward.archetypeId).toBe("driver");
    expect(outward.similarity).toBeGreaterThan(0.9);
    expect(inward.archetypeId).toBe("watcher");
    expect(inward.similarity).toBeGreaterThan(0.85);
  });

  it("向量接近 0 时不挑选第一个角色", () => {
    const result = resolveResult(cancelPack, { q1: "a", q2: "b" });
    expect(result.archetypeId).toBeNull();
    const nearest = nearestCandidate(
      ["express"],
      { express: 0 },
      [
        { id: "first", vector: { express: 1 } },
        { id: "second", vector: { express: -1 } },
      ],
    );
    expect(nearest).toBeNull();
  });

  it("话题镜头可以改变最近的角色", () => {
    const vector = { express: 0.4, decide: 0, pace: 0, conflict: 0.6 };
    const candidates = [
      { id: "voice", vector: { express: 1, decide: 0, pace: 0, conflict: 0 } },
      { id: "edge", vector: { express: 0, decide: 0, pace: 0, conflict: 1 } },
    ];
    const dims = ["express", "decide", "pace", "conflict"];
    expect(nearestCandidate(dims, vector, candidates)?.id).toBe("edge");
    expect(nearestCandidate(dims, emphasize(vector, { express: 5 }), candidates)?.id).toBe("voice");
    expect(() => emphasize(vector, { unknown: 2 })).toThrow(/未知维度/);
  });
});

describe("校验", () => {
  it("拒绝重复的两端组合", () => {
    const duplicate = { ...cancelPack.archetypes[0], id: "high-copy", name: "高型副本" };
    expect(() =>
      validatePack({
        ...cancelPack,
        archetypes: [cancelPack.archetypes[0], duplicate],
      }),
    ).toThrow(/同一组两端/);
  });

  it("拒绝未知维度", () => {
    expect(() =>
      validatePack({
        ...cancelPack,
        questions: [
          {
            id: "q1",
            prompt: "一",
            choices: [
              { id: "a", text: "坏", weights: { missing: 1 } },
              { id: "b", text: "负", weights: { express: -1 } },
            ],
          },
        ],
      }),
    ).toThrow(/未知维度/);
  });
});
