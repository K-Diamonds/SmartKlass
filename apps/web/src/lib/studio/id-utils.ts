export function isLocalStudioId(id: string): boolean {
  return id.startsWith('mod_') || id.startsWith('les_') || id.startsWith('res_');
}
