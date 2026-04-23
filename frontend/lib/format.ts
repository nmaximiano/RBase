export function formatToolName(name: string): string {
  return name
    .replace(/_tool$/, "")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
