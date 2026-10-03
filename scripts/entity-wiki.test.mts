import assert from "node:assert/strict";
import test from "node:test";

import {
  getEntityAttributeRows,
  getEntityVisualBase,
  getEntityVisualSuggestion,
  VISUAL_IDENTITY_COPY,
  withVisualIdentity,
} from "../lib/entity-wiki";
import {
  getWorldbuildingEntityHref,
  getWorldbuildingTimelineEventHref,
} from "../lib/worldbuilding-links";

test("presenta los atributos conocidos con etiquetas por tipo y conserva los demás", () => {
  const rows = getEntityAttributeRows("LOCATION", {
    architecture: "Arcos de basalto",
    landmarks: ["torre inclinada", "puente rojo"],
    privateNote: "dato legado",
    visualIdentity: "Una torre visible desde el valle",
  });

  assert.deepEqual(rows, [
    {
      key: "architecture",
      label: "Arquitectura",
      value: "Arcos de basalto",
      known: true,
    },
    {
      key: "landmarks",
      label: "Lugares reconocibles",
      value: "torre inclinada, puente rojo",
      known: true,
    },
    {
      key: "privateNote",
      label: "privateNote",
      value: "dato legado",
      known: false,
    },
  ]);
});

test("usa sólo texto disponible para sugerir identidad visual y prioriza la guardada", () => {
  const suggestion = getEntityVisualSuggestion(
    "OBJECT",
    "Una brújula heredada con la aguja rota.",
    { material: "bronce", markings: "estrella de ocho puntas" },
  );

  assert.equal(
    suggestion,
    "Material: bronce\nMarcas y detalles: estrella de ocho puntas\nDescripción: Una brújula heredada con la aguja rota.",
  );
  assert.equal(
    getEntityVisualBase("OBJECT", "Descripción existente", {
      visualIdentity: " Disco de bronce con tres muescas ",
      material: "bronce",
    }),
    "Disco de bronce con tres muescas",
  );
});

test("una entidad sin descripción ni atributos no recibe datos visuales inventados", () => {
  assert.equal(getEntityVisualSuggestion("CHARACTER", null, {}), "");
});

test("cada tipo de entidad tiene una pregunta opcional para identidad visual", () => {
  assert.deepEqual(Object.keys(VISUAL_IDENTITY_COPY), [
    "CHARACTER",
    "LOCATION",
    "OBJECT",
    "ORGANIZATION",
    "EVENT",
    "CONCEPT",
  ]);
  for (const copy of Object.values(VISUAL_IDENTITY_COPY)) {
    assert.ok(copy.label.length > 0);
    assert.ok(copy.help.length > 0);
    assert.ok(copy.placeholder.length > 0);
  }
});

test("editar la identidad visual preserva atributos desconocidos y no muta el original", () => {
  const original = { legacyFlag: true, material: "bronce", visualIdentity: "antigua" };

  assert.deepEqual(withVisualIdentity(original, "nueva identidad"), {
    legacyFlag: true,
    material: "bronce",
    visualIdentity: "nueva identidad",
  });
  assert.deepEqual(withVisualIdentity(original, ""), {
    legacyFlag: true,
    material: "bronce",
  });
  assert.equal(original.visualIdentity, "antigua");
});

test("los vínculos usan los parámetros existentes para abrir fichas y eventos", () => {
  assert.equal(
    getWorldbuildingEntityHref("proyecto con espacios", "entidad/uno"),
    "/projects/proyecto%20con%20espacios/worldbuilding?tab=wiki&entityId=entidad%2Funo",
  );
  assert.equal(
    getWorldbuildingTimelineEventHref("p-1", "evento uno"),
    "/projects/p-1/worldbuilding?tab=timeline&eventId=evento%20uno",
  );
});
