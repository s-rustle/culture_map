/**
 * Quick test for roster lookup tool (no API key needed).
 */
import { createRosterLookupTool } from "../lib/tools/roster-lookup";

async function main() {
  const tool = createRosterLookupTool();
  const out1 = await tool.invoke({ query: "Colombia" });
  console.log("--- Colombia ---\n", out1);
  const out2 = await tool.invoke({ query: "all" });
  console.log("\n--- All countries (first 500 chars) ---\n", String(out2).slice(0, 500));
}

main().catch(console.error);
