/** Minimal conditional className joiner (no external dep needed for this module's usage). */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}
