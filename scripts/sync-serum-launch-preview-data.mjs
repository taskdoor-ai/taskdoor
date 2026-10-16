import { readFile, writeFile, stat } from "node:fs/promises";

const assetRoot = new URL("../public/task-assets/serum-launch/", import.meta.url);
const fixtureRoot = new URL("../src/ai/mock/data/", import.meta.url);
const writeJson = (name, value) => writeFile(new URL(name, fixtureRoot), `${JSON.stringify(value, null, 2)}\n`);

await writeJson("serumLaunchHtml.json", await readFile(new URL("serum-launch-board.html", assetRoot), "utf8"));
for (const [source, target] of [["serum-launch-tables.json", "serumLaunchTables.json"], ["serum-launch-documents.json", "serumLaunchDocuments.json"]]) {
  await writeJson(target, JSON.parse(await readFile(new URL(source, assetRoot), "utf8")));
}
const filenames = ["serum-launch-board.html", "serum-launch-budget.xlsx", "serum-launch-channels.csv", "serum-launch-playbook.pdf", "serum-launch-creative-brief.docx", "serum-launch-hero.png"];
const metadata = {};
for (const filename of filenames) metadata[filename] = { sizeBytes: (await stat(new URL(filename, assetRoot))).size };
await writeJson("serumLaunchAssetMetadata.json", metadata);
