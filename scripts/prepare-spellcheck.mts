import { mkdir, copyFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

const require = createRequire(import.meta.url)
const target = new URL("../public/spellcheck/", import.meta.url)
await mkdir(target, { recursive: true })

for (const language of ["es", "en"] as const) {
  const source = dirname(require.resolve(`dictionary-${language}`))
  for (const [file, output] of [["index.aff", `${language}.aff`], ["index.dic", `${language}.dic`], ["license", `${language}-license.txt`]] as const) {
    await copyFile(join(source, file), new URL(output, target))
  }
}
