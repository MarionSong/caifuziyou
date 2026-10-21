import { useState } from "react";
import type { TestPack, TestResult } from "../../engine/types";

export function ResultScreen({
  pack,
  result,
  onRetry,
  onHome,
  onBack,
}: {
  pack: TestPack;
  result: TestResult;
  onRetry: () => void;
  onHome: () => void;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const looseMatch = result.similarity !== null && result.similarity < 0.45;

  async function copyLine() {
    try {
      await navigator.clipboard.writeText(result.shareLine);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="step">
      <p className="result-kicker">{pack.title}</p>
      <h1 className="result-title">{result.title}</h1>
      <p className="poles">{result.polesLabel}</p>
      <p className="summary">{result.summary}</p>
      {looseMatch ? <p className="soft-note">这几个角色你都不太贴，下面是相对最接近的一个。</p> : null}
      <blockquote className="share">
        <p>{result.shareLine}</p>
      </blockquote>
      <div className="actions">
        <button type="button" className="primary" onClick={copyLine}>
          {copied ? "已复制" : "复制这句话"}
        </button>
        <button type="button" className="ghost" onClick={onRetry}>
          再测一次
        </button>
        <button type="button" className="ghost" onClick={onBack}>
          改最后一题
        </button>
        <button type="button" className="ghost" onClick={onHome}>
          换一套
        </button>
      </div>
      <ul className="readings">
        {result.readings.map((reading) => {
          const left = ((reading.normalized + 1) / 2) * 100;
          return (
            <li key={reading.id}>
              <div className="reading-head">
                <span className="reading-name">{reading.name}</span>
                {reading.lean === "mid" ? <span className="reading-lean">两边接近</span> : null}
              </div>
              <div className="meter">
                <span className={reading.lean === "low" ? "meter-end is-on" : "meter-end"}>{reading.lowLabel}</span>
                <div className="meter-track" aria-hidden="true">
                  <span className="meter-dot" style={{ left: `${left}%` }} />
                </div>
                <span className={reading.lean === "high" ? "meter-end is-on" : "meter-end"}>{reading.highLabel}</span>
              </div>
              <p className="reading-sentence">{reading.sentence}</p>
            </li>
          );
        })}
      </ul>
      <p className="footnote">这是你在「{pack.scenario}」里的习惯，不是诊断。</p>
    </section>
  );
}
