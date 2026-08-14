import { prisma } from "@/lib/prisma";
import { cleanPromptTitle, isOpaqueTitle } from "@/lib/prompt-title";

export interface CsvImportResult {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

const MAX_CSV_SIZE = 32 * 1024 * 1024;

function splitCsvLine(line: string, separator: "," | ";"): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === separator) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function detectSeparator(rows: string[]): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  for (const row of rows.slice(0, 20)) {
    const c = (row.match(/,/g) || []).length;
    const s = (row.match(/;/g) || []).length;
    if (row.startsWith('"') || c >= 2) commas += c;
    if (s >= 2) semicolons += s;
  }
  return semicolons > commas ? ";" : ",";
}

export async function importFromCsv(
  sourceId: string,
  rawText: string,
  opts: { adminUserId: string; limit?: number; jobId?: string }
): Promise<CsvImportResult> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let rows: string[][] = [];

  const report = async (final: boolean) => {
    await prisma.importJob.update({
      where: { id: opts.jobId! },
      data: {
        status: final ? (failed > 0 && imported === 0 ? "FAILED" : "COMPLETED") : "PROCESSING",
        totalItems: rows.length,
        importedItems: imported,
        failedItems: failed,
        errorLog: errors.slice(0, 20).join("\n") || null,
        completedAt: final ? new Date() : null,
      },
    });
  };

  try {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const separator = detectSeparator(lines);
    rows = lines.map((l) => splitCsvLine(l, separator)).filter((r) => r.some((c) => c.length));
  } catch (err: any) {
    throw new Error(`Failed to parse CSV: ${err.message}`);
  }
  if (rows.length === 0) throw new Error("CSV file is empty");

  const seenHeaders = ["act", "prompt", "title", "name", "content", "description", "text", "role"];
  let startIdx = 0;
  const firstRow = rows[0].map((c) => c.toLowerCase().trim());
  if (firstRow.some((c) => seenHeaders.includes(c)) && rows.length > 1) {
    startIdx = 1;
  }

  const total = (opts.limit && opts.limit > 0 ? Math.min(opts.limit, rows.length - startIdx) : rows.length - startIdx);

  const job =
    opts.jobId
      ? await prisma.importJob.findUnique({ where: { id: opts.jobId } })
      : await prisma.importJob.create({
          data: {
            sourceId,
            status: "PROCESSING",
            totalItems: 0,
            importedItems: 0,
            failedItems: 0,
            startedAt: new Date(),
          },
        });
  if (!job) throw new Error("Import job not found");
  opts.jobId = job.id;
  await report(false);

  const existingTitles = new Set(
    (
      await prisma.prompt.findMany({
        where: { sourceId },
        select: { title: true },
      })
    ).map((p) => p.title.toLowerCase())
  );

  for (let i = startIdx; i < rows.length; i++) {
    if (i - startIdx >= total) break;
    const cells = rows[i];
    try {
      const titleRaw = (cells[0] || "").replace(/^"|"$/g, "").trim();
      const contentRaw = (cells[1] ?? cells[0] ?? "").replace(/^"|"$/g, "").trim();
      if (titleRaw.length === 1 && contentRaw.length === 1) continue;

      let title = cleanPromptTitle(titleRaw);
      if (!title || isOpaqueTitle(title)) {
        title = cleanPromptTitle(contentRaw.split(/[.!?。！？\n]/)[0]?.slice(0, 90) || "");
      }
      if (!title || isOpaqueTitle(title)) {
        skipped++;
        continue;
      }
      title = title.slice(0, 90);
      const lower = title.toLowerCase();
      if (existingTitles.has(lower)) {
        skipped++;
        continue;
      }
      if (contentRaw.length < 20) {
        skipped++;
        continue;
      }

      await prisma.prompt.create({
        data: {
          title,
          content: contentRaw.slice(0, 12000),
          description: contentRaw.split(/[\n.!?]/)[0]?.slice(0, 180) || null,
          platform: "CHATGPT",
          language: /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(contentRaw) ? "zh" : "en",
          complexity: "INTERMEDIATE",
          isPublic: true,
          tags: [],
          userId: opts.adminUserId,
          sourceId,
        },
      });
      existingTitles.add(lower);
      imported++;
    } catch (err: any) {
      failed++;
      if (errors.length < 20) errors.push(`row ${i + 1}: ${err.message}`);
    }
  }

  await prisma.source.update({
    where: { id: sourceId },
    data: { lastSync: new Date() },
  });
  await report(true);

  return { total, imported, skipped, failed, errors };
}