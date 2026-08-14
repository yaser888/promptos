import { prisma } from "@/lib/prisma";
import { cleanPromptTitle, isOpaqueTitle } from "@/lib/prompt-title";

export interface GitHubImportResult {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface TreeEntry {
  path: string;
  type: "tree" | "blob";
  size?: number;
}

const MAX_FILE_SIZE = 512 * 1024;
const SKIP_DIRS = [".claude", ".github", ".vscode", ".git"];
const SKIP_FILE_PATTERN = /^(README|CLAUDE|LICENSE|CHANGELOG|CONTRIBUTING|CONTRIBUTORS|AUTHORS)(\.[a-z0-9]+)?$/i;
const BRANCH_CANDIDATES = ["main", "master", "develop", "dev"];

function getGitHubToken(): string | null {
  return process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || null;
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

function stripTarballRoot(path: string): string {
  const parts = path.split("/");
  if (parts.length < 2) return path;
  return parts.slice(1).join("/");
}

function platformFromPath(path: string): string {
  const p = path.toLowerCase();
  if (p.includes("chatgpt")) return "CHATGPT";
  if (p.includes("claude")) return "CLAUDE";
  if (p.includes("gemini")) return "GEMINI";
  if (p.includes("midjourney")) return "MIDJOURNEY";
  if (p.includes("stable") || p.includes("diffusion")) return "STABLE_DIFFUSION";
  if (p.includes("perplexity")) return "PERPLEXITY";
  if (p.includes("grok")) return "GROK";
  return "GENERIC";
}

function detectLanguage(content: string): string {
  const cjk = content.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g);
  if (!cjk) return "en";
  const chinese = content.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const japanese = content.match(/[\u3040-\u30ff]/g)?.length ?? 0;
  const korean = content.match(/[\uac00-\ud7af]/g)?.length ?? 0;
  if (chinese >= japanese && chinese >= korean && chinese > 0) return "zh";
  if (japanese > chinese && japanese >= korean) return "ja";
  return "ko";
}

function titleFromPath(path: string): string {
  const base = path.split("/").pop() || path;
  const noExt = base.replace(/\.md$/i, "");
  return cleanPromptTitle(noExt);
}

/**
 * Falls back to the markdown content when the file name is just a code/ID:
 * 1) first `#`/`##` heading, 2) first descriptive sentence, 3) null (skip).
 */
function titleFromContent(raw: string): string | null {
  const headings = raw.match(/^#{1,2}\s+(.+)$/gm);
  for (const h of headings || []) {
    const cleaned = cleanPromptTitle(h.replace(/^#{1,2}\s+/, ""));
    if (cleaned && !isOpaqueTitle(cleaned)) return cleaned.slice(0, 90);
  }

  // Markdown table row: use the first cell as the title ("| 旅游攻略 | 请推荐景点... |")
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const cells = t.split("|").map((c) => c.trim()).filter(Boolean);
    if (!cells.length) continue;
    // Skip header/separator rows like "| 标题 | 问题 |" or "|---|----|"
    if (cells.every((c) => c.length <= 14 && /^[\p{L}\p{N}]+$/u.test(c))) continue;
    const cleaned = cleanPromptTitle(cells[0]);
    if (cleaned && !isOpaqueTitle(cleaned)) return cleaned.slice(0, 90);
  }

  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("!") || t.startsWith("[") || /^https?:\/\//i.test(t)) {
      continue;
    }
    if (t.length < 30 || t.length > 240) continue;
    if (/^```|^---|^\*\*?$/.test(t)) continue;
    const sentence = t.split(/[.!?。！？]/)[0].trim().slice(0, 90);
    if (sentence && !isOpaqueTitle(sentence)) return sentence;
  }

  return null;
}
function resolveTitle(path: string, raw: string): string | null {
  const fromPath = titleFromPath(path);
  if (fromPath && !isOpaqueTitle(fromPath)) return fromPath;
  return titleFromContent(raw);
}

function cleanContent(raw: string, title: string): { content: string; description: string | null } {
  let lines = raw.trim().split("\n");
  lines = lines.filter((line) => {
    const t = line.trim();
    if (/^GPT URL:/i.test(t)) return false;
    if (/^GPT logo:/i.test(t)) return false;
    if (/^<img\b/.test(t)) return false;
    if (/^!\[/.test(t)) return false;
    return true;
  });
  let content = lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim();
  const firstLine = content.split("\n")[0] || "";
  if (/^#\s+/.test(firstLine)) {
    content = content.split("\n").slice(1).join("\n").trim();
  }
  const textLines = content.split("\n").filter((l) => l.trim());
  const desc = textLines.length > 0 ? textLines[0].trim().slice(0, 200) : null;
  return { content, description: desc };
}

async function fetchJson(url: string): Promise<any> {
  const headers: Record<string, string> = {
    "User-Agent": "PromptOS-Importer",
    Accept: "application/vnd.github+json",
  };
  const token = getGitHubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      throw new Error(
        `GitHub API rate limit reached (${res.status}) for ${url}${
          token ? "" : ". Add a GITHUB_TOKEN to .env.local to raise the limit to 5000/hr"
        }`
      );
    }
    throw new Error(`GitHub API ${res.status} for ${url}`);
  }
  return res.json();
}

async function findBranch(owner: string, repo: string): Promise<string | null> {
  let rateLimited = false;
  for (const branch of BRANCH_CANDIDATES) {
    try {
      await fetchJson(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}`);
      return branch;
    } catch (err: any) {
      if (/rate limit|403|429/i.test(err.message || "")) rateLimited = true;
    }
  }
  if (rateLimited) {
    // API quota exhausted: detect the branch via codeload tarball HEAD (no API quota)
    for (const branch of BRANCH_CANDIDATES) {
      try {
        const res = await fetch(`https://codeload.github.com/${owner}/${repo}/tar.gz/${branch}`, {
          method: "HEAD",
          redirect: "follow",
          cache: "no-store",
        });
        if (res.ok) return branch;
      } catch {
        // try next candidate
      }
    }
  }
  return null;
}

async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string
): Promise<{ tree: TreeEntry[]; truncated: boolean }> {
  const data = await fetchJson(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );
  if (!data.tree || !Array.isArray(data.tree)) throw new Error("Invalid repo tree response");
  return { tree: data.tree, truncated: data.truncated === true };
}

async function fetchRawFile(owner: string, repo: string, branch: string, path: string): Promise<string> {
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path.split("/").map(encodeURIComponent).join("/")}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`raw ${res.status}: ${path}`);
  return res.text();
}

function parseTarSize(buf: Buffer, offset: number): number {
  // GNU base-256 encoding: first byte has high bit set
  if (buf[offset] & 0x80) {
    let value = buf[offset] & 0x7f;
    for (let i = 1; i < 12; i++) value = value * 256 + buf[offset + i];
    return value;
  }
  return parseInt(
    buf.subarray(offset, offset + 12).toString("ascii").replace(/\0/g, "").trim(),
    8
  );
}

interface TarEntry {
  name: string;
  size: number;
  type: string;
}

function parseTarBlock(buf: Buffer): TarEntry | null {
  if (buf.length < 512) return null;
  const name = buf.subarray(0, 100).toString("utf8").replace(/\0/g, "").trim();
  if (!name) return null;
  const size = parseTarSize(buf, 124);
  const type = String.fromCharCode(buf[156] || 0x30);
  return { name, size, type };
}

/**
 * Lists repository file paths WITHOUT hitting the (rate-limited) GitHub API,
 * by streaming the codeload tarball and reading tar headers.
 */
async function fetchPathsFromTarball(
  owner: string,
  repo: string,
  branch: string
): Promise<{ paths: string[]; branch: string }> {
  const zlib = await import("zlib");
  const res = await fetch(`https://codeload.github.com/${owner}/${repo}/tar.gz/${branch}`, {
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Tarball download ${res.status} for ${owner}/${repo}`);

  const chunks: Uint8Array[] = [];
  const reader = res.body!.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const gzipped = Buffer.concat(chunks);

  const buf = await new Promise<Buffer>((resolve, reject) => {
    zlib.gunzip(gzipped, (err, result) => (err ? reject(err) : resolve(result)));
  });

  const finalPaths: string[] = [];
  let offset = 0;
  let longName: string | null = null;

  while (offset + 512 <= buf.length) {
    const entry = parseTarBlock(buf.subarray(offset, offset + 512));
    offset += 512;
    if (!entry) continue;
    const dataSize = Math.ceil(entry.size / 512) * 512;
    if (offset + dataSize > buf.length) break;

    if (entry.type === "L") {
      longName = buf.subarray(offset, offset + entry.size).toString("utf8").replace(/\0/g, "").trim();
      offset += dataSize;
      continue;
    }
    if (entry.type === "x" || entry.type === "g") {
      const pax = buf.subarray(offset, offset + entry.size).toString("utf8");
      const m = pax.match(/\bpath=([^\s]+)/);
      if (m) longName = decodeURIComponent(m[1].replace(/"/g, ""));
      offset += dataSize;
      continue;
    }
    if ((entry.type === "0" || entry.type === "" || entry.type === "\0") && (longName || entry.name)) {
      finalPaths.push(longName || entry.name);
    }
    longName = null;
    offset += dataSize;
  }

  return { paths: finalPaths, branch };
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

export async function importFromGitHub(
  sourceId: string,
  owner: string,
  repo: string,
  opts: { adminUserId: string; limit?: number; jobId?: string }
): Promise<GitHubImportResult> {
  const errors: string[] = [];
  let total = 0;
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const report = async (final: boolean) => {
    await prisma.importJob.update({
      where: { id: opts.jobId! },
      data: {
        status: final ? (failed > 0 && imported === 0 ? "FAILED" : "COMPLETED") : "PROCESSING",
        totalItems: total,
        importedItems: imported,
        failedItems: failed,
        errorLog: errors.slice(0, 20).join("\n") || null,
        completedAt: final ? new Date() : null,
      },
    });
  };

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

  try {
    let branch = await findBranch(owner, repo);
    if (!branch) {
      throw new Error(
        `Could not reach GitHub (rate limited or repo not found). Try adding a GITHUB_TOKEN to .env.local.`
      );
    }

    let files: TreeEntry[] = [];
    let treeTruncated = false;
    try {
      const treeResult = await fetchRepoTree(owner, repo, branch);
      files = treeResult.tree;
      treeTruncated = treeResult.truncated;
    } catch (err: any) {
      const isRateLimit = /rate limit|403|429|409|tree too large/i.test(err.message || "");
      if (!isRateLimit) throw err;
      // Rate limited / tree too large: list files via the codeload tarball (no API quota)
      const tar = await fetchPathsFromTarball(owner, repo, branch);
      branch = tar.branch;
      files = tar.paths.map((path) => ({ path: stripTarballRoot(path), type: "blob" as const }));
      errors.push("GitHub API rate limited or tree too large — used tarball fallback instead");
    }
    if (treeTruncated) {
      const tar = await fetchPathsFromTarball(owner, repo, branch);
      files = tar.paths.map((path) => ({ path: stripTarballRoot(path), type: "blob" as const }));
      errors.push("Repo tree exceeded GitHub's 100k-entry API limit — used tarball fallback");
    }

    files = files
      .filter((f) => f.type === "blob")
      .filter((f) => f.path.toLowerCase().endsWith(".md"))
      .filter((f) => {
        const first = f.path.split("/")[0] || "";
        return !SKIP_DIRS.includes(first.toLowerCase());
      })
      .filter((f) => {
        const name = f.path.split("/").pop() || "";
        return !SKIP_FILE_PATTERN.test(name);
      })
      .filter((f) => (f.size ?? 0) <= MAX_FILE_SIZE);

    if (files.length === 0) {
      throw new Error("No markdown files found in the repository");
    }

    const effectiveLimit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, files.length) : files.length;
    const targets = files.slice(0, effectiveLimit);
    total = targets.length;

    const existingTitles = new Set(
      (
        await prisma.prompt.findMany({
          where: { sourceId },
          select: { title: true },
        })
      ).map((p) => p.title.toLowerCase())
    );

    await runWithConcurrency(targets, 5, async (file) => {
      try {
        const raw = await fetchRawFile(owner, repo, branch, file.path);
        const title = resolveTitle(file.path, raw);
        if (!title) {
          skipped++;
          if (errors.length < 20) errors.push(`${file.path}: no readable title (file name and content are opaque)`);
          return;
        }
        if (existingTitles.has(title.toLowerCase())) {
          skipped++;
          return;
        }
        const { content, description } = cleanContent(raw, title);
        if (content.length < 20) {
          skipped++;
          return;
        }

        let created = false;
        for (let attempt = 0; attempt < 3 && !created; attempt++) {
          try {
            await prisma.prompt.create({
              data: {
                title,
                content,
                description,
                platform: platformFromPath(file.path) as any,
                language: detectLanguage(content),
                complexity: "INTERMEDIATE",
                isPublic: true,
                tags: [file.path.split("/")[0]],
                userId: opts.adminUserId,
                sourceId,
              },
            });
            created = true;
          } catch (err: any) {
            if (attempt === 2) throw err;
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
        existingTitles.add(title.toLowerCase());
        imported++;
        if (imported % 50 === 0) await report(false);
      } catch (err: any) {
        failed++;
        if (errors.length < 20) errors.push(`${file.path}: ${err.message}`);
      }
    });

    await prisma.source.update({
      where: { id: sourceId },
      data: { lastSync: new Date() },
    });
    await report(true);
  } catch (err: any) {
    errors.push(err.message);
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorLog: err.message, completedAt: new Date() },
    });
    throw err;
  }

  return { total, imported, skipped, failed, errors };
}
