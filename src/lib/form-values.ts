// Form value parsing shared between the deposit form and the deposit action.
//
// It lives here rather than in `actions.ts` because that module is
// `"use server"` and may only export async functions — the same reason
// `auth-errors.ts` exists. Sharing it matters: the review step shows a
// depositor the topics and languages their dataset will carry, and a preview
// that split the input differently from the code that stores it would be
// showing them something that is not going to happen.

/** "health, education , " -> ["health", "education"] */
export function splitList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v !== "");
}
