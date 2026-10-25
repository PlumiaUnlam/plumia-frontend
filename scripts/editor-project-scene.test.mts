import assert from "node:assert/strict"
import { resolveProjectSceneId } from "../lib/editor-project-scene"

assert.equal(
  resolveProjectSceneId("scene-from-another-project", ["scene-a", "scene-b"]),
  "scene-a",
)
assert.equal(resolveProjectSceneId("scene-b", ["scene-a", "scene-b"]), "scene-b")
assert.equal(resolveProjectSceneId("old-scene", []), null)

console.log("La selección de escena queda dentro del proyecto activo.")
