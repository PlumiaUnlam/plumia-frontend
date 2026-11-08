// Ejecuta todas las pruebas unitarias (scripts/*.test.mts) una por una.
// Los procesos hijos heredan NODE_V8_COVERAGE, así `c8` junta la cobertura de todos.
import { spawnSync } from "node:child_process"
import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const tests = readdirSync(scriptsDir)
  .filter((name) => name.endsWith(".test.mts"))
  .sort()

let failed = 0
for (const test of tests) {
  console.log(`\n▶ ${test}`)
  const result = spawnSync(process.execPath, ["--import", "tsx", join(scriptsDir, test)], {
    stdio: "inherit",
    env: process.env,
  })
  if (result.status !== 0) {
    failed += 1
    console.error(`✗ ${test} falló (código ${result.status})`)
  }
}

console.log(`\n${tests.length - failed}/${tests.length} archivos de pruebas unitarias en verde`)
process.exit(failed === 0 ? 0 : 1)
