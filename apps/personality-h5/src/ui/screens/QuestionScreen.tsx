import { useEffect, useRef } from "react";
import type { TestPack } from "../../engine/types";

export function QuestionScreen({
  pack,
  index,
  selectedId,
  onChoose,
  onBack,
}: {
  pack: TestPack;
  index: number;
  selectedId?: string;
  onChoose: (choiceId: string) => void;
  onBack: () => void;
}) {
  const question = pack.questions[index];
  const total = pack.questions.length;
  const progress = ((index + 1) / total) * 100;
  const lock = useRef(false);

  function chooseOnce(choiceId: string) {
    if (lock.current) return;
    lock.current = true;
    onChoose(choiceId);
    window.setTimeout(() => {
      lock.current = false;
    }, 320);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!question) return;
      if (event.key === "1") chooseOnce(question.choices[0].id);
      if (event.key === "2" && question.choices[1]) chooseOnce(question.choices[1].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChoose, question]);

  if (!question) return null;

  return (
    <section className="step" key={question.id}>
      <div className="progress-row">
        <span>{pack.title}</span>
        <span>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <div
        className="track"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label="答题进度"
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div aria-live="polite">
        <h1 className="prompt">{question.prompt}</h1>
      </div>
      <div className="choices">
        {question.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className={choice.id === selectedId ? "choice is-selected" : "choice"}
            onClick={() => chooseOnce(choice.id)}
          >
            {choice.text}
          </button>
        ))}
      </div>
      <div className="question-nav">
        <button type="button" className="ghost" onClick={onBack}>
          {index === 0 ? "返回" : "上一题"}
        </button>
      </div>
    </section>
  );
}
