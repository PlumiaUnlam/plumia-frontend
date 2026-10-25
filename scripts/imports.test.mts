import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const importDiagnosticCodes = new Set([
  1192, // Module has no default export.
  1259, // Default import requires esModuleInterop.
  1261, // Included file names differ only by casing.
  2305, // Module has no exported member.
  2306, // File is not a module.
  2307, // Cannot find module.
  2613, // Module has no default export.
  2614, // Module has no exported member.
  2724, // Module has no exported member with the requested name.
  2835, // Relative import needs an explicit extension.
])

test("todos los imports del frontend resuelven", () => {
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json")
  assert.ok(configPath, "No se encontró tsconfig.json")

  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  assert.equal(config.error, undefined, "No se pudo leer tsconfig.json")

  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath,
  )
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  })
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]
    .filter(({ code }) => importDiagnosticCodes.has(code))

  assert.deepEqual(
    diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")),
    [],
  )
})
