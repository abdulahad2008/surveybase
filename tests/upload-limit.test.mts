import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACCEPTED_UPLOAD_EXTENSIONS, MAX_UPLOAD_BYTES, megabytes, isBinaryWorkbook } from "@/lib/spreadsheet";

/** The `bodySizeLimit` the app is actually built with, in bytes. */
function configuredBodySizeLimit(): number {
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  const match = config.match(/bodySizeLimit:\s*"(\d+(?:\.\d+)?)(kb|mb)"/i);
  assert.ok(match, "next.config.ts should set serverActions.bodySizeLimit");
  const scale = match[2].toLowerCase() === "mb" ? 1024 * 1024 : 1024;
  return Number(match[1]) * scale;
}

test("the upload limit stays under the Server Action body limit", () => {
  // A deposit posts the file through a Server Action, so a MAX_UPLOAD_BYTES
  // above bodySizeLimit would mean the depositor passes our check and then
  // fails on the framework's, with no message that explains anything.
  const limit = configuredBodySizeLimit();
  assert.ok(
    MAX_UPLOAD_BYTES < limit,
    `MAX_UPLOAD_BYTES (${megabytes(MAX_UPLOAD_BYTES)}MB) must stay under bodySizeLimit (${megabytes(limit)}MB)`,
  );
  // And with enough room left for the rest of the form.
  assert.ok(limit - MAX_UPLOAD_BYTES >= 256 * 1024, "leave headroom for the other fields");
});

test("the file input advertises exactly what the parser can read", () => {
  const advertised = ACCEPTED_UPLOAD_EXTENSIONS.split(",");
  assert.ok(advertised.includes(".csv"));
  assert.ok(advertised.includes(".xlsx"), "Google Forms exports .xlsx by default");
  for (const extension of advertised) {
    assert.match(extension, /^\.[a-z]+$/);
  }
});

test("isBinaryWorkbook picks the parser by extension, case-insensitively", () => {
  assert.ok(isBinaryWorkbook("responses.XLSX"));
  assert.ok(isBinaryWorkbook("a.b.ods"));
  assert.ok(!isBinaryWorkbook("responses.csv"));
  assert.ok(!isBinaryWorkbook("xlsx.csv"));
});
