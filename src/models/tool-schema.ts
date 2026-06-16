import { z } from "zod";
import type { ToolRegistry } from "../tools/types";
import type { ModelToolDefinition } from "./types";

export function buildModelToolDefinitions(registry: ToolRegistry): ModelToolDefinition[] {
  return Array.from(registry.values())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodObjectToJsonSchema(tool.schema),
      },
    }));
}

function zodObjectToJsonSchema(schema: z.ZodSchema): Record<string, unknown> {
  const objectSchema = unwrapOptional(schema);
  if (!(objectSchema instanceof z.ZodObject)) {
    return {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    };
  }

  const shape = objectSchema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [name, propertySchema] of Object.entries(shape)) {
    properties[name] = zodPrimitiveToJsonSchema(propertySchema as z.ZodSchema);
    if (!(propertySchema instanceof z.ZodOptional)) {
      required.push(name);
    }
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function zodPrimitiveToJsonSchema(schema: z.ZodSchema): Record<string, string> {
  const unwrapped = unwrapOptional(schema);
  if (unwrapped instanceof z.ZodString) {
    return { type: "string" };
  }
  if (unwrapped instanceof z.ZodNumber) {
    return { type: "number" };
  }
  if (unwrapped instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }
  return { type: "string" };
}

function unwrapOptional(schema: z.ZodSchema): z.ZodSchema {
  if (schema instanceof z.ZodOptional) {
    return schema.unwrap();
  }
  return schema;
}
