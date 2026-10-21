import { useEffect, useState } from "react";
import { packs, getPack } from "../content/registry";
import { back, begin, choose, openPack, retry } from "../engine/session";
import { resolveResult } from "../engine/score";
import type { Session } from "../engine/types";
import { HomeScreen } from "./screens/HomeScreen";
import { IntroScreen } from "./screens/IntroScreen";
import { QuestionScreen } from "./screens/QuestionScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { loadSession, saveSession } from "./storage";

const ACCENTS = ["cinnabar", "moss"] as const;

function accentFor(session: Session): (typeof ACCENTS)[number] {
  if (session.phase === "home") return "cinnabar";
  const index = packs.findIndex((pack) => pack.id === session.packId);
  return ACCENTS[(index < 0 ? 0 : index) % ACCENTS.length];
}

export function App() {
  const [session, setSession] = useState<Session>(() => loadSession(packs));
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    saveSession(session);
    setNotice(null);
    window.scrollTo(0, 0);
  }, [session]);

  function run(update: () => Session) {
    try {
      setSession(update());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "这步没有完成。");
    }
  }

  const accent = accentFor(session);
  let screen = <HomeScreen packs={packs} onOpen={(packId) => run(() => openPack(packId))} />;

  if (session.phase === "intro") {
    const pack = getPack(session.packId);
    screen = <IntroScreen pack={pack} onBegin={() => run(() => begin(session))} onBack={() => run(() => back(session))} />;
  }

  if (session.phase === "question") {
    const pack = getPack(session.packId);
    const current = pack.questions[session.index];
    screen = (
      <QuestionScreen
        pack={pack}
        index={session.index}
        selectedId={current ? session.answers[current.id] : undefined}
        onChoose={(choiceId) => run(() => choose(session, pack, choiceId))}
        onBack={() => run(() => back(session, pack))}
      />
    );
  }

  if (session.phase === "result") {
    const pack = getPack(session.packId);
    try {
      const result = resolveResult(pack, session.answers);
      screen = (
        <ResultScreen
          pack={pack}
          result={result}
          onRetry={() => run(() => retry(session))}
          onHome={() => setSession({ phase: "home" })}
          onBack={() => run(() => back(session, pack))}
        />
      );
    } catch (error) {
      screen = (
        <section className="step">
          <h1 className="display display-small">这套答案出不了结果。</h1>
          <p className="lede">{error instanceof Error ? error.message : "请重新开始。"}</p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => setSession({ phase: "intro", packId: pack.id })}>
              重新开始
            </button>
          </div>
        </section>
      );
    }
  }

  return (
    <div className={`app`} data-accent={accent}>
      <div className="shell">
        <header className="mast">
          <div className="brand">
            <span className="seal" aria-hidden="true">
              半
            </span>
            <div>
              <div className="brand-name">半步</div>
              <div className="brand-note">能换话题的人格测试</div>
            </div>
          </div>
          <p className="mast-copy">
            底层是可替换的题库。同一套页面，可以先测日常习惯，再测一段关系里的角色。后面的综艺人物，也挂在这四个坐标上。
          </p>
        </header>
        <main className="stage">
          {notice ? <p className="footnote">{notice}</p> : null}
          {screen}
        </main>
      </div>
    </div>
  );
}
