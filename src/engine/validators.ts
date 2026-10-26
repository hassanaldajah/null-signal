import type { Validator } from './schema';

export interface ValidationContext {
  /** evidence id -> content, for answers that must match earlier evidence. */
  evidence: Record<string, string>;
  /** Every terminal command the player ran in this level. */
  commands: string[];
  /** Current terminal directory. */
  cwd?: string;
}

export function normalizeAnswer(value: string, caseSensitive = false): string {
  const collapsed = value.trim().replace(/\s+/g, ' ').replace(/^["']|["']$/g, '');
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

/** True when `input` satisfies the validator. Command validators ignore `input`. */
export function validate(validator: Validator, input: string, ctx: ValidationContext): boolean {
  switch (validator.kind) {
    case 'answer':
      return validator.accept.some(
        (accepted) => normalizeAnswer(accepted, validator.caseSensitive) === normalizeAnswer(input, validator.caseSensitive),
      );
    case 'evidence': {
      const expected = ctx.evidence[validator.evidence];
      return expected !== undefined && normalizeAnswer(expected) === normalizeAnswer(input);
    }
    case 'command': {
      const regex = new RegExp(validator.pattern);
      return ctx.commands.some((command) => regex.test(command));
    }
    case 'cwd':
      return ctx.cwd === validator.path;
    case 'choice':
      return input === validator.correct;
  }
}
