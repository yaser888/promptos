import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { MarketplaceService } from "@/services/marketplace.service";
import { isEnabled } from "@/lib/settings";

export async function GET(req: NextRequest) {
  try {
    if (!(await isEnabled("marketplaceEnabled"))) {
      return NextResponse.json(
        { error: "Marketplace is currently unavailable", disabled: true },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawSort = searchParams.get("sortBy") || "createdAt";
    const ALLOWED_SORTS = new Set(["createdAt", "title", "price", "copyCount"]);
    const params = {
      search: searchParams.get("search") || undefined,
      platform: searchParams.get("platform") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      minPrice: searchParams.get("minPrice")
        ? Number(searchParams.get("minPrice"))
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? Number(searchParams.get("maxPrice"))
        : undefined,
      sortBy: ALLOWED_SORTS.has(rawSort) ? rawSort : "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 12,
    };

    const result = await MarketplaceService.getListings(params);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching marketplace listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = await req.json();
    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      );
    }

    const result = await MarketplaceService.purchase(
      listingId,
      session.user.clerkId
    );
    return NextResponse.json(result);
  } catch (error: any) {
    const message = error?.message || "Failed to purchase listing";
    const status = message.includes("own") ? 400 : message.includes("found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
