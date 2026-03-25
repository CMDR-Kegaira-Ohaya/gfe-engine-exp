// Family rendering is being moved into native renderer ownership.
// This file remains as a temporary compatibility stub so legacy imports
// do not reintroduce a post-render mutation pass here.

export function applyFamilyPass() {
  return false;
}
