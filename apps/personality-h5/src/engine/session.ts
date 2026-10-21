import { TestEngineError } from "./errors";
import { resolveResult } from "./score";
import type { Session, TestPack } from "./types";

export const HOME: Session = { phase: "home" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function openPack(packId: string): Session {
  return { phase: "intro", packId };
}

export function begin(session: Session): Session {
  if (session.phase !== "intro") throw new TestEngineError("还没进入这套题。");
  return { phase: "question", packId: session.packId, index: 0, answers: {} };
}

export function choose(session: Session, pack: TestPack, choiceId: string): Session {
  if (session.phase !== "question" || session.packId !== pack.id) {
    throw new TestEngineError("现在不在这套题的答题里。");
  }
  const question = pack.questions[session.index];
  if (!question || !question.choices.some((choice) => choice.id === choiceId)) {
    throw new TestEngineError("选项不存在。");
  }
  const answers = { ...session.answers, [question.id]: choiceId };
  const nextIndex = session.index + 1;
  if (nextIndex >= pack.questions.length) {
    return { phase: "result", packId: pack.id, answers };
  }
  return { phase: "question", packId: pack.id, index: nextIndex, answers };
}

export function back(session: Session, pack?: TestPack): Session {
  if (session.phase === "home") return session;
  if (session.phase === "intro") return HOME;
  if (!pack || pack.id !== session.packId) throw new TestEngineError("题库对不上。");
  if (session.phase === "result") {
    return {
      phase: "question",
      packId: pack.id,
      index: pack.questions.length - 1,
      answers: session.answers,
    };
  }
  if (session.index === 0) return { phase: "intro", packId: pack.id };
  return {
    phase: "question",
    packId: pack.id,
    index: session.index - 1,
    answers: session.answers,
  };
}

export function retry(session: Session): Session {
  if (session.phase !== "result") throw new TestEngineError("现在没有可以重测的结果。");
  return { phase: "intro", packId: session.packId };
}

function cleanAnswers(pack: TestPack, raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const answers: Record<string, string> = {};
  for (const question of pack.questions) {
    const choiceId = raw[question.id];
    if (typeof choiceId !== "string") continue;
    if (question.choices.some((choice) => choice.id === choiceId)) {
      answers[question.id] = choiceId;
    }
  }
  return answers;
}

export function restoreSession(raw: unknown, packs: readonly TestPack[]): Session {
  if (!isRecord(raw)) return HOME;
  if (raw.phase === "home") return HOME;
  if (typeof raw.packId !== "string") return HOME;
  const pack = packs.find((item) => item.id === raw.packId);
  if (!pack) return HOME;
  if (raw.phase === "intro") return { phase: "intro", packId: pack.id };

  const answers = cleanAnswers(pack, raw.answers);
  if (raw.phase === "question") {
    const index = raw.index;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= pack.questions.length) {
      return { phase: "intro", packId: pack.id };
    }
    const kept: Record<string, string> = {};
    for (let i = 0; i <= index; i += 1) {
      const question = pack.questions[i];
      const choiceId = answers[question.id];
      if (choiceId) kept[question.id] = choiceId;
    }
    return { phase: "question", packId: pack.id, index, answers: kept };
  }
  if (raw.phase === "result") {
    try {
      resolveResult(pack, answers);
      return { phase: "result", packId: pack.id, answers };
    } catch {
      return { phase: "intro", packId: pack.id };
    }
  }
  return HOME;
}
