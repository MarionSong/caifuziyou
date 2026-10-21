import { restoreSession } from "../engine/session";
import type { Session, TestPack } from "../engine/types";

const KEY = "banbu.session.v1";

export function loadSession(packs: readonly TestPack[]): Session {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { phase: "home" };
    return restoreSession(JSON.parse(raw) as unknown, packs);
  } catch {
    return { phase: "home" };
  }
}

export function saveSession(session: Session): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // 隐私模式写不进会话时，这次访问仍然可以做完。
  }
}
