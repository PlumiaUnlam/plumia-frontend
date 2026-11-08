import assert from "node:assert/strict"
import test from "node:test"

import {
  ZEN_TOOLBAR_HIDE_DELAY_MS,
  ZEN_TOOLBAR_POLL_MS,
  shouldHideZenToolbar,
} from "../lib/zen-toolbar"

test("el menú Zen espera unos segundos antes de ocultarse, no lo hace al instante", () => {
  assert.ok(ZEN_TOOLBAR_HIDE_DELAY_MS >= 2000, "demora demasiado corta")
  assert.ok(ZEN_TOOLBAR_HIDE_DELAY_MS <= 6000, "demora demasiado larga")
  assert.ok(ZEN_TOOLBAR_POLL_MS < ZEN_TOOLBAR_HIDE_DELAY_MS)
})

test("no se oculta mientras el mouse, el foco o un desplegable lo están usando", () => {
  assert.equal(shouldHideZenToolbar({ engaged: true, idleMs: 0 }), false)
  assert.equal(shouldHideZenToolbar({ engaged: true, idleMs: 60_000 }), false)
})

test("no se oculta antes de cumplirse la demora", () => {
  assert.equal(shouldHideZenToolbar({ engaged: false, idleMs: 0 }), false)
  assert.equal(
    shouldHideZenToolbar({ engaged: false, idleMs: ZEN_TOOLBAR_HIDE_DELAY_MS - 1 }),
    false,
  )
})

test("se oculta una vez cumplida la demora sin uso", () => {
  assert.equal(
    shouldHideZenToolbar({ engaged: false, idleMs: ZEN_TOOLBAR_HIDE_DELAY_MS }),
    true,
  )
  assert.equal(shouldHideZenToolbar({ engaged: false, idleMs: 10_000 }), true)
})

test("acepta una demora propia", () => {
  assert.equal(shouldHideZenToolbar({ engaged: false, idleMs: 500, delayMs: 500 }), true)
  assert.equal(shouldHideZenToolbar({ engaged: false, idleMs: 499, delayMs: 500 }), false)
})
