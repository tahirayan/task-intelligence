import { z } from "zod";

export const categorizedTasksSchema = z
  .array(
    z.object({
      id: z.string(),
      content: z.string(),
      createdAt: z.string(),
      category: z.enum([
        "feature",
        "bugfix",
        "infrastructure",
        "research",
        "design",
        "documentation",
      ]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    })
  )
  .min(1);

export const prioritizedTasksSchema = z
  .array(
    z.object({
      id: z.string(),
      content: z.string(),
      createdAt: z.string(),
      category: z.enum([
        "feature",
        "bugfix",
        "infrastructure",
        "research",
        "design",
        "documentation",
      ]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
      priority: z.enum(["critical", "high", "medium", "low"]),
      urgencyScore: z.number(),
      dependencies: z.array(z.string()),
    })
  )
  .min(1);

export const plannedTasksSchema = z
  .array(
    z.object({
      id: z.string(),
      content: z.string(),
      createdAt: z.string(),
      category: z.enum([
        "feature",
        "bugfix",
        "infrastructure",
        "research",
        "design",
        "documentation",
      ]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
      priority: z.enum(["critical", "high", "medium", "low"]),
      urgencyScore: z.number(),
      dependencies: z.array(z.string()),
      title: z.string(),
      shortDescription: z.string(),
      estimatedHours: z.number(),
      executionSteps: z.array(
        z.object({
          order: z.number(),
          description: z.string(),
          type: z.enum(["implementation", "review", "testing", "deployment"]),
        })
      ),
      risks: z.array(z.string()),
    })
  )
  .min(1);
