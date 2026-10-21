import type { TestPack } from "../../engine/types";

export function HomeScreen({ packs, onOpen }: { packs: readonly TestPack[]; onOpen: (packId: string) => void }) {
  return (
    <section className="step">
      <p className="eyebrow">人格测试</p>
      <h1 className="display">先看清自己怎么相处。</h1>
      <p className="lede">
        四件日常的事：怎么开口，怎么判断，怎么推进，怎么处理不合。题库可以换，坐标先留着。
      </p>
      <ol className="pack-list">
        {packs.map((pack, index) => (
          <li key={pack.id}>
            <button type="button" className="pack-card" onClick={() => onOpen(pack.id)}>
              <span className="pack-index">0{index + 1}</span>
              <span className="pack-title">{pack.title}</span>
              <span className="pack-scenario">{pack.scenario}</span>
              <span className="pack-meta">
                {pack.questions.length} 题 · {pack.topic}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="footnote">这是一面镜子，不是诊断。</p>
    </section>
  );
}
