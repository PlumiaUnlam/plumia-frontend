import type { EntityType } from "@/types/entity";

export type EntityAttributeRow = {
  key: string;
  label: string;
  value: string;
  known: boolean;
};

const ATTRIBUTE_LABELS: Record<EntityType, Record<string, string>> = {
  CHARACTER: {
    role: "Rol",
    occupation: "Ocupación",
    appearance: "Apariencia",
    physicalDescription: "Descripción física",
    hair: "Cabello",
    hairColor: "Color de cabello",
    eyes: "Ojos",
    eyeColor: "Color de ojos",
    skinTone: "Tono de piel",
    height: "Estatura",
    build: "Complexión",
    distinctiveFeatures: "Rasgos distintivos",
    clothing: "Vestimenta",
    age: "Edad",
    species: "Especie",
    personality: "Personalidad",
    abilities: "Habilidades",
    motivations: "Motivaciones",
  },
  LOCATION: {
    terrain: "Terreno",
    architecture: "Arquitectura",
    landmarks: "Lugares reconocibles",
    climate: "Clima",
    region: "Región",
    atmosphere: "Atmósfera",
  },
  OBJECT: {
    shape: "Forma",
    material: "Material",
    markings: "Marcas y detalles",
    origin: "Origen",
    function: "Función",
    size: "Tamaño",
  },
  ORGANIZATION: {
    emblem: "Emblema",
    colors: "Colores",
    symbols: "Símbolos",
    purpose: "Propósito",
    structure: "Estructura",
    members: "Integrantes",
  },
  EVENT: {
    place: "Lugar",
    location: "Lugar",
    participants: "Participantes",
    date: "Fecha",
    temporalLabel: "Período",
    consequences: "Consecuencias",
  },
  CONCEPT: {
    definition: "Definición",
    symbol: "Símbolo",
    representation: "Representación",
    meaning: "Significado",
    origin: "Origen",
  },
};

const VISUAL_ATTRIBUTE_KEYS: Record<EntityType, readonly string[]> = {
  CHARACTER: [
    "appearance",
    "physicalDescription",
    "hair",
    "hairColor",
    "eyes",
    "eyeColor",
    "skinTone",
    "height",
    "build",
    "distinctiveFeatures",
    "clothing",
    "age",
    "species",
  ],
  LOCATION: ["terrain", "architecture", "landmarks"],
  OBJECT: ["shape", "material", "markings"],
  ORGANIZATION: ["emblem", "colors", "symbols"],
  EVENT: ["place", "location", "participants"],
  CONCEPT: ["symbol", "representation", "meaning"],
};

export const VISUAL_IDENTITY_COPY: Record<
  EntityType,
  { label: string; help: string; placeholder: string }
> = {
  CHARACTER: {
    label: "Rasgos físicos que se mantienen",
    help: "Anotá los rasgos físicos que deben repetirse en sus imágenes.",
    placeholder: "Ej.: ojos verdes, pelo negro y una cicatriz en la ceja.",
  },
  LOCATION: {
    label: "Detalles que identifican el lugar",
    help: "Anotá el terreno, la arquitectura o los detalles que deben repetirse.",
    placeholder: "Ej.: acantilado blanco y torre inclinada.",
  },
  OBJECT: {
    label: "Detalles que identifican el objeto",
    help: "Anotá su forma, material y marcas distintivas.",
    placeholder: "Ej.: disco de bronce con tres muescas y una piedra azul.",
  },
  ORGANIZATION: {
    label: "Símbolos y colores de la organización",
    help: "Anotá los colores, emblemas o símbolos que la identifican.",
    placeholder: "Ej.: halcón plateado sobre fondo azul.",
  },
  EVENT: {
    label: "Elementos que representan el evento",
    help: "Anotá qué momento o detalles deberían verse en sus imágenes.",
    placeholder: "Ej.: el portal abierto y las antorchas apagadas.",
  },
  CONCEPT: {
    label: "Símbolo o representación del concepto",
    help: "Anotá qué imagen o símbolo representa este concepto.",
    placeholder: "Ej.: una llave rota rodeada de ceniza.",
  },
};

export function getEntityAttributes(
  value: unknown,
): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function withVisualIdentity(
  attributes: Record<string, unknown>,
  value: string,
): Record<string, unknown> {
  const next = { ...attributes };
  if (value.trim()) {
    next.visualIdentity = value;
  } else {
    delete next.visualIdentity;
  }
  return next;
}

export function getEntityAttributeRows(
  type: EntityType,
  value: unknown,
): EntityAttributeRow[] {
  const attributes = getEntityAttributes(value);
  const labels = ATTRIBUTE_LABELS[type];

  return Object.entries(attributes)
    .filter(([key, entry]) => key !== "visualIdentity" && hasDisplayValue(entry))
    .map(([key, entry]) => ({
      key,
      label: labels[key] ?? key,
      value: formatAttributeValue(entry),
      known: Object.hasOwn(labels, key),
    }));
}

export function getEntityVisualSuggestion(
  type: EntityType,
  description: string | null | undefined,
  value: unknown,
): string {
  const attributes = getEntityAttributes(value);
  const visualDetails = VISUAL_ATTRIBUTE_KEYS[type]
    .filter((key) => hasDisplayValue(attributes[key]))
    .map((key) => `${ATTRIBUTE_LABELS[type][key]}: ${formatAttributeValue(attributes[key])}`);
  const visualDescription =
    type === "CHARACTER"
      ? extractCharacterVisualDescription(description)
      : description?.trim();
  const parts = [...visualDetails];
  if (visualDescription) {
    parts.push(
      type === "CHARACTER"
        ? `Rasgos visibles descritos: ${visualDescription}`
        : `Contexto visual: ${visualDescription}`,
    );
  }
  return parts.join("\n");
}

export function extractCharacterVisualDescription(
  description: string | null | undefined,
): string {
  if (!description?.trim()) return "";

  const featurePatterns = [
    /\b(?:ojos?|mirada|cabello|pelo|piel|tono de piel)\b(?:\s+(?:de|color|muy))?(?:\s+(?!y\b|pero\b|aunque\b|es\b|tiene\b|conoce\b)[\p{L}\p{M}\d-]+){1,3}/giu,
    /\b(?:complexión|estatura|altura|rostro|cara|barba|bigote|pecas)\b(?:\s+(?:de|color|muy))?(?:\s+(?!y\b|pero\b|aunque\b|es\b|tiene\b|conoce\b)[\p{L}\p{M}\d-]+){1,3}/giu,
    /\b(?:canas|cicatrices?|vestimenta|ropa)\b(?:\s+(?:de|color|muy))?(?:\s+(?!y\b|pero\b|aunque\b|es\b|tiene\b|conoce\b)[\p{L}\p{M}\d-]+){1,3}/giu,
  ];
  const clothingPatterns = [
    /\bviste\s+(?:un[oa]s?\s+)?[\p{L}\p{M}\d-]+(?:\s+(?!y\b|pero\b|aunque\b|es\b|tiene\b|conoce\b)[\p{L}\p{M}\d-]+){0,3}/giu,
    /\blleva\s+(?:un[oa]s?\s+)?[\p{L}\p{M}\d-]+(?:\s+(?!y\b|pero\b|aunque\b|es\b|tiene\b|conoce\b)[\p{L}\p{M}\d-]+){0,3}/giu,
  ];
  const physicalPatterns = [
    /\b(?:es|mide)\s+(?:alto|alta|bajo|baja|delgado|delgada|robusto|robusta|musculoso|musculosa)\b/giu,
    /\b(?:es|mide)\s+\d+(?:[,.]\d+)?\s*(?:cm|m)\b/giu,
  ];
  const collectInTextOrder = (patterns: readonly RegExp[]) =>
    patterns
      .flatMap((pattern) =>
        [...description.matchAll(pattern)].map((match) => ({
          value: match[0].trim(),
          index: match.index ?? 0,
        })),
      )
      .sort((left, right) => left.index - right.index)
      .map(({ value }) => value);
  const matches = [
    ...collectInTextOrder(featurePatterns),
    ...collectInTextOrder(clothingPatterns),
    ...collectInTextOrder(physicalPatterns),
  ];
  return [...new Set(matches)].join(", ");
}

export function getEntityVisualBase(
  type: EntityType,
  description: string | null | undefined,
  value: unknown,
): string {
  const attributes = getEntityAttributes(value);
  const identity = attributes.visualIdentity;
  return typeof identity === "string" && identity.trim()
    ? identity.trim()
    : getEntityVisualSuggestion(type, description, value);
}

export function formatAttributeValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatAttributeValue).filter(Boolean).join(", ");
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, entry]) => `${key}: ${formatAttributeValue(entry)}`)
      .join(", ");
  }
  return "";
}

function hasDisplayValue(value: unknown): boolean {
  return value !== null && value !== undefined && formatAttributeValue(value).trim() !== "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
