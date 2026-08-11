import { prisma } from "@/lib/prisma";

export type LogLevel = "info" | "warn" | "error";

function formatError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (typeof err === "string") return err;
  return JSON.stringify(err);
}

export async function logSystem(
  level: LogLevel,
  source: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        level,
        source,
        message: message.slice(0, 2000),
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  } catch {
    // DB logging is best-effort; never break the caller if the table is missing
  }
  const prefix = `[${level.toUpperCase()}]`;
  if (level === "error") console.error(prefix, source, message);
  else if (level === "warn") console.warn(prefix, source, message);
  else console.log(prefix, source, message);
}

export const logInfo = (source: string, message: string, metadata?: Record<string, unknown>) =>
  logSystem("info", source, message, metadata);

export const logWarn = (source: string, message: string, metadata?: Record<string, unknown>) =>
  logSystem("warn", source, message, metadata);

export const logError = (source: string, message: string, metadata?: Record<string, unknown>) =>
  logSystem("error", source, message, metadata);

export { formatError };
