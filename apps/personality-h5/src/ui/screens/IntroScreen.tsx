import type { TestPack } from "../../engine/types";

export function IntroScreen({
  pack,
  onBegin,
  onBack,
}: {
  pack: TestPack;
  onBegin: () => void;
  onBack: () => void;
}) {
  return (
    <section className="step">
      <p className="eyebrow">{pack.topic}</p>
      <h1 className="display display-small">{pack.title}</h1>
      <p className="lede">{pack.intro}</p>
      <ul className="axis-list">
        {pack.dimensions.map((dimension) => (
          <li key={dimension.id}>
            <span>{dimension.name}</span>
            <span>
              {dimension.highLabel} / {dimension.lowLabel}
            </span>
          </li>
        ))}
      </ul>
      <div className="actions">
        <button type="button" className="primary" onClick={onBegin}>
          开始
        </button>
        <button type="button" className="ghost" onClick={onBack}>
          返回
        </button>
      </div>
    </section>
  );
}
