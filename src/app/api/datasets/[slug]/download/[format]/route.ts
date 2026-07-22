import { NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv",
  json: "application/json",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; format: string }> },
) {
  const { slug, format } = await params;
  if (!(format in CONTENT_TYPES)) {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: dataset } = await supabase
    .from("datasets")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!dataset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: file } = await supabase
    .from("files")
    .select("storage_path")
    .eq("dataset_id", dataset.id)
    .eq("format", "csv")
    .maybeSingle();
  if (!file) {
    return NextResponse.json({ error: "No data file" }, { status: 404 });
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("dataset-files")
    .download(file.storage_path);
  if (downloadError || !blob) {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }

  const csvText = await blob.text();
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("download_log").insert({
    dataset_id: dataset.id,
    user_id: user?.id ?? null,
    format,
  });
  await supabase.rpc("increment_download_count", { p_dataset_id: dataset.id });

  let body: BodyInit;
  if (format === "csv") {
    body = csvText;
  } else if (format === "json") {
    body = JSON.stringify(parsed.data, null, 2);
  } else {
    const worksheet = XLSX.utils.json_to_sheet(parsed.data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    body = new Blob([Uint8Array.from(buffer)]);
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${slug}.${format}"`,
    },
  });
}
