import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Brand from "@/lib/models/Brand";

export async function GET() {
  try {
    await connectToDatabase();
    const brands = await Brand.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    return NextResponse.json(brands);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}


