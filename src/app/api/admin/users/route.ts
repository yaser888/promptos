import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as any } },
            { email: { contains: search, mode: "insensitive" as any } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          subscription: { select: { plan: true, status: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();

    let upserted;
    if (body.id) {
      upserted = await prisma.user.update({
        where: { id: body.id },
        data: {
          email: body.email ?? undefined,
          name: body.name ?? undefined,
          role: body.role as any,
        },
      });
    } else {
      upserted = await prisma.user.upsert({
        where: { clerkId: body.clerkId },
        update: {
          email: body.email,
          name: body.name,
          role: body.role as any,
        },
        create: {
          clerkId: body.clerkId,
          email: body.email,
          name: body.name,
          role: body.role as any,
        },
      });
    }

    if (body.plan) {
      await prisma.subscription.upsert({
        where: { userId: upserted.id },
        update: { plan: body.plan as any },
        create: {
          userId: upserted.id,
          plan: body.plan as any,
          status: "ACTIVE" as any,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return NextResponse.json({ user: upserted });
  } catch (error: any) {
    console.error("Error creating/updating user:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to create/update user";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    await prisma.user.delete({ where: { id: body.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    const status = error?.status || 500;
    const message = status === 401 || status === 403 ? error.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status });
  }
}
