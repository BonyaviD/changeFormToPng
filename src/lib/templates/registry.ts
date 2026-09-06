import halalTraining from "./halal-training";
import type { CertificateTemplate } from "./types";

/**
 * The single place the app learns which certificate designs exist.
 *
 * To add a design: create `src/lib/templates/<id>/index.ts` exporting a
 * `CertificateTemplate`, then add it to this array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const templates: CertificateTemplate<any>[] = [halalTraining];

export const DEFAULT_TEMPLATE_ID = halalTraining.id;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const byId = new Map<string, CertificateTemplate<any>>(
  templates.map((template) => [template.id, template]),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTemplate(id: string): CertificateTemplate<any> {
  const template = byId.get(id);
  if (!template) {
    throw new Error(`قالب «${id}» شناخته نشد.`);
  }
  return template;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findTemplate(id: string | null | undefined): CertificateTemplate<any> | null {
  if (!id) return null;
  return byId.get(id) ?? null;
}

export { type CertificateTemplate } from "./types";
