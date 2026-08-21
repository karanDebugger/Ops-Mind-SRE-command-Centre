import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const incidentSchema = z.object({
  title: z.string(),
  severity: z.string(),
  service: z.string(),
  logs: z.array(z.string()),
  deployment: z.string(),
  runbook: z.string(),
});

const releaseSchema = z.object({
  service: z.string(),
  version: z.string(),
  stage: z.number(),
  p95LatencyMs: z.number(),
  errorRate: z.number(),
  retryBurn: z.number(),
  policyFindings: z.array(z.string()),
  provenance: z.string(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  ops: router({
    analyzeIncident: publicProcedure.input(incidentSchema).mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an SRE incident commander. Use only the supplied evidence. Return concise JSON with diagnosis, confidence, contributingFactors, evidence, and nextBestAction. Never claim an action was executed.",
            },
            { role: "user", content: JSON.stringify(input) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "incident_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  diagnosis: { type: "string" },
                  confidence: { type: "number" },
                  contributingFactors: { type: "array", items: { type: "string" } },
                  evidence: { type: "array", items: { type: "string" } },
                  nextBestAction: { type: "string" },
                },
                required: ["diagnosis", "confidence", "contributingFactors", "evidence", "nextBestAction"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices?.[0]?.message?.content;
        return typeof content === "string" ? JSON.parse(content) : null;
      } catch (error) {
        console.warn("[Ops] LLM unavailable; UI will use local evidence-backed demo response.", error);
        return null;
      }
    }),
    releaseAdvisor: publicProcedure.input(releaseSchema).mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a release engineer. Use only supplied release evidence. Return strict JSON with recommendation (pause, continue, or rollback), confidence from 0 to 1, diagnosis, evidence, and guardrail. Never claim a real deployment or rollback happened." },
            { role: "user", content: JSON.stringify(input) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "release_advisor",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  recommendation: { type: "string", enum: ["pause", "continue", "rollback"] },
                  confidence: { type: "number" },
                  diagnosis: { type: "string" },
                  evidence: { type: "array", items: { type: "string" } },
                  guardrail: { type: "string" },
                },
                required: ["recommendation", "confidence", "diagnosis", "evidence", "guardrail"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices?.[0]?.message?.content;
        return typeof content === "string" ? JSON.parse(content) : null;
      } catch (error) {
        console.warn("[Ops] Release advisor unavailable; UI will use its deterministic evidence response.", error);
        return null;
      }
    }),
    generatePostmortem: publicProcedure.input(incidentSchema).mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Draft a structured SRE postmortem from supplied evidence. Be factual, blameless, and label unknowns." },
            { role: "user", content: JSON.stringify(input) },
          ],
        });
        return response.choices?.[0]?.message?.content ?? null;
      } catch (error) {
        console.warn("[Ops] Postmortem model unavailable.", error);
        return null;
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
