import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputPath = resolve(
  process.cwd(),
  'src/generated/openapi.ts',
);

const source = await readFile(outputPath, 'utf8');
const marker = 'export interface operations {';
const markerIndex = source.indexOf(marker);

if (markerIndex === -1) {
  process.exit(0);
}

const nextSection = source.indexOf('\nexport ', markerIndex + marker.length);
const head = source.slice(0, markerIndex);
const tail = nextSection === -1 ? '' : source.slice(nextSection);
const patched = `${head}export interface operations {}\n${tail}`;

await writeFile(outputPath, patched, 'utf8');
