
import { summarymock } from "@/mocks/worldbuilding.mock";

export async function getSummary() {
  return summarymock[0].summary;
}