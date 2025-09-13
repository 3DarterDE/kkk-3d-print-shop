import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Manufacturer from '@/lib/models/Manufacturer';

// PUT - Update manufacturer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    const body = await request.json();
    const { name, description, isActive, sortOrder } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Check if another manufacturer with this name or slug already exists
    const existingManufacturer = await Manufacturer.findOne({
      _id: { $ne: id },
      $or: [{ name }, { slug }]
    });
    
    if (existingManufacturer) {
      return NextResponse.json({ error: 'Manufacturer with this name already exists' }, { status: 400 });
    }
    
    const manufacturer = await Manufacturer.findByIdAndUpdate(
      id,
      {
        name,
        slug,
        description,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? sortOrder : 0
      },
      { new: true }
    );
    
    if (!manufacturer) {
      return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 });
    }
    
    return NextResponse.json(manufacturer);
  } catch (error) {
    console.error('Error updating manufacturer:', error);
    return NextResponse.json({ error: 'Failed to update manufacturer' }, { status: 500 });
  }
}

// DELETE - Delete manufacturer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    
    // Check if manufacturer is used by any products
    const { Product } = await import('@/lib/models/Product');
    const productsUsingManufacturer = await Product.countDocuments({ manufacturer: id });
    
    if (productsUsingManufacturer > 0) {
      return NextResponse.json({ 
        error: `Cannot delete manufacturer. It is used by ${productsUsingManufacturer} product(s).` 
      }, { status: 400 });
    }
    
    const manufacturer = await Manufacturer.findByIdAndDelete(id);
    
    if (!manufacturer) {
      return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Manufacturer deleted successfully' });
  } catch (error) {
    console.error('Error deleting manufacturer:', error);
    return NextResponse.json({ error: 'Failed to delete manufacturer' }, { status: 500 });
  }
}
