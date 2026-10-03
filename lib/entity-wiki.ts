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
  CHARACTER: ["appearance", "physicalDescription"],
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
    label: "Rasgos físicos que deben mantenerse",
    help: "Anota solo los rasgos estables del personaje. La pose, la expresión y el fondo se definen para cada imagen.",
    placeholder: "Ej.: ojos verdes, cabello negro ondulado y una cicatriz fina sobre la ceja izquierda.",
  },
  LOCATION: {
    label: "Elementos que hacen reconocible el lugar",
    help: "Describe el terreno, la arquitectura o los detalles que deberían repetirse entre imágenes.",
    placeholder: "Ej.: acantilado blanco, torre inclinada y puente de madera rojiza.",
  },
  OBJECT: {
    label: "Forma, material o marcas distintivas",
    help: "Indica qué rasgos del objeto deben conservarse en sus distintas imágenes.",
    placeholder: "Ej.: disco de bronce oscuro con tres muescas y una piedra azul en el centro.",
  },
  ORGANIZATION: {
    label: "Emblema, colores o símbolos identificatorios",
    help: "Registra los elementos visuales que identifican a la facción u organización.",
    placeholder: "Ej.: halcón plateado sobre fondo azul y una franja diagonal blanca.",
  },
  EVENT: {
    label: "Momento o elementos que conviene representar",
    help: "Describe los elementos visuales que identifican este evento; fecha y participantes pueden quedar en los datos de la ficha.",
    placeholder: "Ej.: el portal abierto y las antorchas apagándose alrededor.",
  },
  CONCEPT: {
    label: "Símbolo o representación preferida",
    help: "Anota una representación existente o preferida para este concepto.",
    placeholder: "Ej.: una llave rota rodeada por un círculo de ceniza.",
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
  const parts = [
    ...visualDetails,
    ...(description?.trim() ? [`Descripción: ${description.trim()}`] : []),
  ];
  return parts.join("\n");
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
