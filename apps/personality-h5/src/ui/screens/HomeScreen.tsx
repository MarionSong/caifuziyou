import type { TestPack } from "../../engine/types";

export function HomeScreen({ packs, onOpen }: { packs: readonly TestPack[]; onOpen: (packId: string) => void }) {
  return (
    <section className="step">
      <p className="eyebrow">七天合宿</p>
      <h1 className="display">
        你被关进
        <br />
        一栋房子。
      </h1>
      <p className="lede">
        和几个陌生人住一周，拍一档生活综艺。没有剧本。十二个现场，看你怎么开口、怎么判断、怎么把这七天过下去。另一套题换了现场，按黄仁勋、Lori、黄乐公开走过的选择来出。
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
