import type { ClasscheckConfig } from "./types";

export { ClasscheckError, runClasscheck } from "./run";

export type { ClasscheckConfig, ClasscheckFinding, ClasscheckResult } from "./types";

/**
 * Declare the classcheck configuration — the `classcheck.config.ts` default export. The four axes
 * (`entry`, `source`, `allowFrom`, `allow`) are the entire surface: which checks run, and at what
 * severity, is sealed, exactly like every other canon config.
 *
 * @example
 * ```ts
 * // classcheck.config.ts
 * import { defineClasscheckConfig } from "@coldsmirk/classcheck";
 *
 * export default defineClasscheckConfig({
 *   entry: "src/app.css",
 *   allowFrom: ["src/styles/global.css"]
 * });
 * ```
 */
export function defineClasscheckConfig(config: ClasscheckConfig): ClasscheckConfig {
  return config;
}
