import type { AnnotationTag, FlowkitConfig, FlowplanDef } from '../../types/index'

// ── Authoring helpers ───────────────────────────────────────────────────────────
//
// Identity functions that exist purely for TypeScript autocomplete + validation
// at author time. They return their argument unchanged — no runtime cost.
//
// Usage:
//   // workspaces/<ws>/flowkit.config.ts
//   import { defineConfig } from "@platform/core/config";
//   export default defineConfig({ projects: { shop: { label: "Shop" } } });
//
//   // workspaces/<ws>/projects/<p>/flowplans/Checkout.ts
//   import { defineFlow } from "@platform/core/config";
//   export default defineFlow({ id: "checkout-flow", name: "Checkout", steps: [...] });

/** Author a workspace manifest with full type-checking + autocomplete. */
export function defineConfig(config: FlowkitConfig): FlowkitConfig {
  return config
}

/** Author a Flowplan with full type-checking + autocomplete. */
export function defineFlow(flow: FlowplanDef): FlowplanDef {
  return flow
}

/** Author an annotation tag with full type-checking + autocomplete. */
export function tag(label: string, options?: Omit<AnnotationTag, 'label'>): AnnotationTag {
  return { label, ...options }
}
