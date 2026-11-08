import type { CDPSession, Page } from "@playwright/test"

/** Instrumentación de timers, listeners y observers del navegador, y contadores de DOM/memoria por CDP. */

export type Resources = {
  intervals: number
  timeouts: number
  listeners: number
  observers: number
}

export const INSTRUMENTATION = () => {
  const intervals = new Set<number>()
  const timeouts = new Set<number>()
  const originalSetInterval = window.setInterval.bind(window)
  const originalClearInterval = window.clearInterval.bind(window)
  const originalSetTimeout = window.setTimeout.bind(window)
  const originalClearTimeout = window.clearTimeout.bind(window)

  window.setInterval = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
    const id = originalSetInterval(handler, delay, ...args)
    intervals.add(id)
    return id
  }) as typeof window.setInterval
  window.clearInterval = ((id?: number) => {
    if (id !== undefined) intervals.delete(id)
    originalClearInterval(id)
  }) as typeof window.clearInterval
  window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
    const id: number = originalSetTimeout(
      typeof handler === "function"
        ? (...callArgs: unknown[]) => {
            timeouts.delete(id)
            return (handler as (...a: unknown[]) => unknown)(...callArgs)
          }
        : handler,
      delay,
      ...args,
    )
    timeouts.add(id)
    return id
  }) as typeof window.setTimeout
  window.clearTimeout = ((id?: number) => {
    if (id !== undefined) timeouts.delete(id)
    originalClearTimeout(id)
  }) as typeof window.clearTimeout

  // Listeners sobre objetos que viven toda la sesión: si un componente no los
  // quita al desmontarse, se acumulan.
  const registry = new Map<string, Set<unknown>>()
  const longLived = (target: unknown) =>
    target === window ||
    target === document ||
    target === document.documentElement ||
    target === document.body
  const keyOf = (target: unknown, type: string, options: unknown) => {
    const capture = typeof options === "boolean" ? options : Boolean((options as AddEventListenerOptions | undefined)?.capture)
    const name = target === window ? "window" : target === document ? "document" : "node"
    return name + ":" + type + ":" + capture
  }
  const originalAdd = EventTarget.prototype.addEventListener
  const originalRemove = EventTarget.prototype.removeEventListener
  EventTarget.prototype.addEventListener = function (type: string, listener: unknown, options?: unknown) {
    if (longLived(this) && listener) {
      const key = keyOf(this, type, options)
      if (!registry.has(key)) registry.set(key, new Set())
      registry.get(key)!.add(listener)
    }
    return originalAdd.call(this, type, listener as EventListener, options as AddEventListenerOptions)
  }
  EventTarget.prototype.removeEventListener = function (type: string, listener: unknown, options?: unknown) {
    if (longLived(this) && listener) registry.get(keyOf(this, type, options))?.delete(listener)
    return originalRemove.call(this, type, listener as EventListener, options as AddEventListenerOptions)
  }

  // Observers activos: con al menos un elemento observado. Radix libera con `unobserve`
  // (sin `disconnect`), así que se descuenta cada elemento que se deja de observar.
  const activeObservers = new Map<unknown, Set<unknown>>()
  for (const name of ["ResizeObserver", "MutationObserver", "IntersectionObserver"] as const) {
    const Original = (window as unknown as Record<string, unknown>)[name] as new (...args: unknown[]) => {
      observe(...a: unknown[]): void
      unobserve?(...a: unknown[]): void
      disconnect(): void
    }
    if (!Original) continue
    ;(window as unknown as Record<string, unknown>)[name] = class extends Original {
      observe(...args: unknown[]) {
        if (!activeObservers.has(this)) activeObservers.set(this, new Set())
        activeObservers.get(this)!.add(args[0])
        return super.observe(...args)
      }
      unobserve(...args: unknown[]) {
        const targets = activeObservers.get(this)
        targets?.delete(args[0])
        if (targets && targets.size === 0) activeObservers.delete(this)
        return super.unobserve?.(...args)
      }
      disconnect() {
        activeObservers.delete(this)
        return super.disconnect()
      }
    }
  }

  ;(window as unknown as { __resources: () => Resources }).__resources = () => ({
    intervals: intervals.size,
    timeouts: timeouts.size,
    listeners: Array.from(registry.values()).reduce((sum, set) => sum + set.size, 0),
    observers: activeObservers.size,
  })
}

export async function resources(page: Page): Promise<Resources> {
  return page.evaluate(() => (window as unknown as { __resources: () => Resources }).__resources())
}

export async function domCounters(cdp: CDPSession) {
  await cdp.send("HeapProfiler.collectGarbage")
  const { nodes, jsEventListeners } = (await cdp.send("Memory.getDOMCounters")) as {
    nodes: number
    jsEventListeners: number
  }
  const { usedSize } = (await cdp.send("Runtime.getHeapUsage")) as { usedSize: number }
  return { nodes, jsEventListeners, heapMb: usedSize / 1024 / 1024 }
}

