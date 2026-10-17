import { clonePattern, type Pattern } from './pattern';
/** Do not replace the active editor until the previous project is archived. */
export async function preparePhotoHandoff(next: Pattern, previous: Pattern | null, archive: (pattern: Pattern) => Promise<void>) {
  if (previous) await archive(previous);
  return clonePattern(next);
}
