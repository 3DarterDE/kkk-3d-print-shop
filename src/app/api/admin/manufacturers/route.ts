import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Manufacturer from '@/lib/models/Manufacturer';

// GET - Fetch all manufacturers
export async function GET() {
  try {
    await connectToDatabase();
    
    const manufacturers = await Manufacturer.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    
    return NextResponse.json(manufacturers);
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    return NextResponse.json({ error: 'Failed to fetch manufacturers' }, { status: 500 });
  }
}

// POST - Create new manufacturer
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { name, description } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Check if manufacturer with this name or slug already exists
    const existingManufacturer = await Manufacturer.findOne({
      $or: [{ name }, { slug }]
    });
    
    if (existingManufacturer) {
      return NextResponse.json({ error: 'Manufacturer with this name already exists' }, { status: 400 });
    }
    
    // Get the highest sort order
    const lastManufacturer = await Manufacturer.findOne({}, {}, { sort: { sortOrder: -1 } });
    const sortOrder = lastManufacturer ? lastManufacturer.sortOrder + 1 : 0;
    
    const manufacturer = new Manufacturer({
      name,
      slug,
      description,
      sortOrder
    });
    
    await manufacturer.save();
    
    return NextResponse.json(manufacturer);
  } catch (error) {
    console.error('Error creating manufacturer:', error);
    return NextResponse.json({ error: 'Failed to create manufacturer' }, { status: 500 });
  }
}
