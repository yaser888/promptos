import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
};

const MAX_SIZE = 2 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PNG, JPEG, WebP, GIF, SVG or ICO." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Logo must be smaller than 2MB" }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", "branding");
    fs.mkdirSync(dir, { recursive: true });
    const filename = `logo-${Date.now()}.${ext}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

    let setting = await prisma.setting.findFirst();
    if (!setting) {
      setting = await prisma.setting.create({ data: { logoUrl: `/uploads/branding/${filename}` } });
    } else {
      setting = await prisma.setting.update({
        where: { id: setting.id },
        data: { logoUrl: `/uploads/branding/${filename}` },
      });
    }

    return NextResponse.json({ logoUrl: setting.logoUrl });
  } catch (error: any) {
    console.error("Error uploading logo:", error);
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 401 || status === 403 ? error.message : "Failed to upload logo" },
      { status }
    );
  }
}

export async function DELETE() {
  try {
    await requireAdmin();
    const setting = await prisma.setting.findFirst();
    if (!setting?.logoUrl) {
      return NextResponse.json({ removed: false });
    }

    const oldPath = path.join(process.cwd(), "public", setting.logoUrl.replace(/^\/+/, ""));
    try {
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    } catch {
      // file already gone — ignore
    }

    await prisma.setting.update({
      where: { id: setting.id },
      data: { logoUrl: null },
    });

    return NextResponse.json({ removed: true });
  } catch (error: any) {
    console.error("Error removing logo:", error);
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 401 || status === 403 ? error.message : "Failed to remove logo" },
      { status }
    );
  }
}
