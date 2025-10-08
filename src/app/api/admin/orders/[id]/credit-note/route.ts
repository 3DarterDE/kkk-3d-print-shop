import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import ReturnRequest from '@/lib/models/Return';
import { generateCreditNotePDF } from '@/lib/credit-note-template';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;

    await connectToDatabase();
    const { id } = await params;

    // Find the order by either MongoDB _id or orderNumber
    let order;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // If it's a MongoDB ObjectId (24 hex characters)
      order = await Order.findById(id).lean();
    } else {
      // If it's an orderNumber
      order = await Order.findOne({ orderNumber: id }).lean();
    }
    
    if (!order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    // Only allow credit note download for completed returns
    if (order.status !== 'return_completed') {
      return NextResponse.json({ error: 'Storno-Rechnung nur für abgeschlossene Rücksendungen verfügbar' }, { status: 400 });
    }

    // Find the return request by orderId (ObjectId)
    const returnRequest = await ReturnRequest.findOne({ orderId: order._id.toString(), status: 'completed' }).lean();
    if (!returnRequest) {
      return NextResponse.json({ error: 'Rücksendung nicht gefunden' }, { status: 404 });
    }

    // Check if PDF already exists in cache
    const cacheDir = path.join(process.cwd(), 'cache', 'credit-notes');
    const pdfPath = path.join(cacheDir, `storno-${order.orderNumber}.pdf`);
    
    try {
      // Try to read cached PDF
      const cachedPdf = await fs.readFile(pdfPath);
      
      // Return cached PDF
      return new NextResponse(cachedPdf as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="storno-${order.orderNumber}.pdf"`,
          'Content-Length': cachedPdf.length.toString(),
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      });
    } catch (error) {
      // PDF not cached, generate new one
    }

    // Get accepted items from return request
    const acceptedItems = returnRequest.items.filter((item: any) => item.accepted);
    if (acceptedItems.length === 0) {
      return NextResponse.json({ error: 'Keine akzeptierten Rücksendungsartikel gefunden' }, { status: 404 });
    }

    // Calculate original prices and discounts
    const orderSubtotalCents = order.items.reduce((s: number, it: any) => s + (Number(it.price) * Number(it.quantity)), 0);
    const discountCents = order.discountCents || 0;
    const pointsDiscountCents = order.bonusPointsRedeemed ? 
      (order.bonusPointsRedeemed >= 5000 ? 5000 : 
       order.bonusPointsRedeemed >= 4000 ? 3500 :
       order.bonusPointsRedeemed >= 3000 ? 2000 :
       order.bonusPointsRedeemed >= 2000 ? 1000 :
       order.bonusPointsRedeemed >= 1000 ? 500 : 0) : 0;

    // Map accepted items to credit note format
    const creditNoteItems = acceptedItems.map((item: any) => {
      const originalItem = order.items.find((oi: any) => 
        oi.name === item.name && 
        JSON.stringify(oi.variations || {}) === JSON.stringify(item.variations || {})
      );
      
      if (!originalItem) {
        throw new Error(`Original item not found for ${item.name}`);
      }

      const originalUnitPrice = originalItem.price;
      const originalLineTotal = originalUnitPrice * item.quantity;
      
      // Calculate prorated discounts
      const share = orderSubtotalCents > 0 ? Math.min(1, Math.max(0, originalLineTotal / orderSubtotalCents)) : 0;
      const proratedDiscount = Math.round(discountCents * share);
      const proratedPoints = Math.round(pointsDiscountCents * share);
      
      const discountPerUnit = Math.round(proratedDiscount / item.quantity);
      const bonusPointsDiscountPerUnit = Math.round(proratedPoints / item.quantity);

      return {
        name: item.name,
        variations: item.variations,
        quantity: item.quantity,
        price: originalUnitPrice,
        total: originalLineTotal,
        discountPerUnit: discountPerUnit,
        bonusPointsDiscountPerUnit: bonusPointsDiscountPerUnit
      };
    });

    // Generate credit note PDF using the same logic as customer route
    const pdfDoc = await generateCreditNotePDF(
      order,
      returnRequest,
      creditNoteItems
    );

    // Convert jsPDF to buffer
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));

    // Cache the PDF for future requests
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(pdfPath, pdfBuffer);
    } catch (cacheError) {
      console.warn('Failed to cache credit note PDF:', cacheError);
      // Continue without caching
    }

    // Set response headers
    const filename = `storno-${order.orderNumber}.pdf`;
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Length', pdfBuffer.length.toString());
    headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    return new NextResponse(pdfBuffer, { headers });
  } catch (error) {
    console.error('Error generating credit note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
