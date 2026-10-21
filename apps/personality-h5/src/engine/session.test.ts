import { describe, expect, it } from "vitest";
import { packs } from "../content/registry";
import { TestEngineError } from "./errors";
import { back, begin, choose, openPack, restoreSession, retry } from "./session";

const pack = packs[0];

describe("答题状态", () => {
  it("从开场走到结果，再返回上一题", () => {
    let session = begin(openPack(pack.id));
    expect(session.phase).toBe("question");
    for (const question of pack.questions) {
      if (session.phase !== "question") throw new Error("状态中断");
      session = choose(session, pack, question.choices[0].id);
    }
    expect(session.phase).toBe("result");
    if (session.phase !== "result") return;
    expect(Object.keys(session.answers)).toHaveLength(12);

    session = back(session, pack);
    expect(session).toMatchObject({ phase: "question", index: 11 });
    session = retry({ phase: "result", packId: pack.id, answers: {} });
    expect(session).toEqual({ phase: "intro", packId: pack.id });
  });

  it("第一题返回开场，开场返回首页", () => {
    const started = begin(openPack(pack.id));
    expect(back(started, pack)).toEqual({ phase: "intro", packId: pack.id });
    expect(back({ phase: "intro", packId: pack.id })).toEqual({ phase: "home" });
  });

  it("不在答题时拒绝选择", () => {
    expect(() => choose({ phase: "home" }, pack, "a")).toThrow(TestEngineError);
    expect(() => choose({ phase: "question", packId: pack.id, index: 0, answers: {} }, pack, "missing")).toThrow(
      /选项不存在/,
    );
  });

  it("刷新后丢掉对不上的进度", () => {
    expect(restoreSession({ phase: "question", packId: "missing", index: 1, answers: {} }, packs).phase).toBe("home");
    expect(
      restoreSession({ phase: "question", packId: pack.id, index: 99, answers: {} }, packs),
    ).toEqual({ phase: "intro", packId: pack.id });
    expect(restoreSession({ phase: "result", packId: pack.id, answers: { q01: "nope" } }, packs)).toEqual({
      phase: "intro",
      packId: pack.id,
    });
    const stored = restoreSession(
      { phase: "question", packId: pack.id, index: 1, answers: { q01: "a", q02: "b", q03: "a" } },
      packs,
    );
    expect(stored).toEqual({
      phase: "question",
      packId: pack.id,
      index: 1,
      answers: { q01: "a", q02: "b" },
    });
  });
});
