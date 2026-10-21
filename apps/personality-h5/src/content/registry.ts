import { validatePack } from "../engine/validate";
import type { TestPack } from "../engine/types";
import dailyAxes from "./packs/daily-axes.json";
import relationshipRoles from "./packs/relationship-roles.json";

function load(raw: unknown): TestPack {
  return validatePack(raw);
}

/** 首页按这个顺序渲染。加一套题：放入 packs/，再在这里登记。 */
export const packs: readonly TestPack[] = [load(dailyAxes), load(relationshipRoles)];

export function getPack(id: string): TestPack {
  const pack = packs.find((item) => item.id === id);
  if (!pack) throw new Error(`找不到题库：${id}`);
  return pack;
}
