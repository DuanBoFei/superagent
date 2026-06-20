import { z } from "zod";

export const ToolStartSchema = z.object({
  toolCallId: z.string().min(1),
  toolName: z.string().min(1),
  title: z.string().min(1),
  timestamp: z.number(),
});

export const ToolOutputSchema = z.object({
  toolCallId: z.string().min(1),
  content: z.string(),
});

export const ToolCompleteSchema = z.object({
  toolCallId: z.string().min(1),
  status: z.enum(["success", "error"]),
  errorType: z.string().optional(),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),
});

export const ToolErrorSchema = z.object({
  toolCallId: z.string().min(1),
  errorType: z.string(),
  message: z.string(),
  stackTrace: z.string().optional(),
});

export type ToolStartEvent = z.infer<typeof ToolStartSchema>;
export type ToolOutputEvent = z.infer<typeof ToolOutputSchema>;
export type ToolCompleteEvent = z.infer<typeof ToolCompleteSchema>;
export type ToolErrorEvent = z.infer<typeof ToolErrorSchema>;
