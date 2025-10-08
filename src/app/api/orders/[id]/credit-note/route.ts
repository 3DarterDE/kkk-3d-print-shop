import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
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
    const { user, response } = await requireUser();
    if (!user) return response!;

    const { id } = await params;
    await connectToDatabase();

    // Find order by orderNumber (since id parameter contains orderNumber, not ObjectId)
    const order = await Order.findOne({ orderNumber: id }).lean();
    if (!order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    // Check if user owns this order
    if (order.userId !== user._id.toString()) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
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

    // Prepare accepted items for credit note with proper discount calculation
    const orderSubtotalCents = order.items.reduce((s: number, it: any) => s + (Number(it.price) * Number(it.quantity)), 0);
    const orderDiscountCents = Number(order.discountCents || 0);
    
    const acceptedItems = returnRequest.items
      .filter((item: any) => item.accepted)
      .map((item: any) => {
        // Find original item in order to get original price
        const originalItem = order.items.find((oi: any) => 
          oi.name === item.name && 
          JSON.stringify(oi.variations || {}) === JSON.stringify(item.variations || {})
        );
        
        const originalUnitPrice = originalItem ? Number(originalItem.price) : Number(item.price);
        const originalLineTotal = originalUnitPrice * item.quantity;
        
        // Calculate discount per unit
        let discountPerUnit = 0;
        let bonusPointsDiscountPerUnit = 0;
        
        if (orderDiscountCents > 0 && orderSubtotalCents > 0 && originalItem) {
          const origLineTotal = Number(originalItem.price) * Number(originalItem.quantity);
          const share = Math.min(1, Math.max(0, origLineTotal / orderSubtotalCents));
          const proratedDiscount = Math.round(orderDiscountCents * share);
          discountPerUnit = Math.round(proratedDiscount / Number(originalItem.quantity));
        }
        
        // Calculate bonus points discount per unit
        const bonusPointsRedeemed = Number(order.bonusPointsRedeemed || 0);
        if (bonusPointsRedeemed > 0 && orderSubtotalCents > 0 && originalItem) {
          const getPointsDiscountAmount = (points: number) => {
            if (points >= 5000) return 50; // 50€
            if (points >= 4000) return 35; // 35€
            if (points >= 3000) return 20; // 20€
            if (points >= 2000) return 10; // 10€
            if (points >= 1000) return 5;  // 5€
            return 0;
          };
          
          const totalPointsDiscountCents = getPointsDiscountAmount(bonusPointsRedeemed) * 100;
          const origLineTotal = Number(originalItem.price) * Number(originalItem.quantity);
          const share = Math.min(1, Math.max(0, origLineTotal / orderSubtotalCents));
          const proratedPointsDiscount = Math.round(totalPointsDiscountCents * share);
          bonusPointsDiscountPerUnit = Math.round(proratedPointsDiscount / Number(originalItem.quantity));
        }
        
        return {
          name: item.name,
          quantity: item.quantity,
          price: originalUnitPrice, // Show original price
          total: originalLineTotal, // Show original line total
          discountPerUnit: discountPerUnit,
          bonusPointsDiscountPerUnit: bonusPointsDiscountPerUnit,
          variations: item.variations || undefined,
        };
      });

    if (acceptedItems.length === 0) {
      return NextResponse.json({ error: 'Keine akzeptierten Artikel für Storno-Rechnung' }, { status: 400 });
    }

    // Create PDF
    const doc = await generateCreditNotePDF(order, returnRequest, acceptedItems);
    
    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');
    
    // Cache the PDF for future requests
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(pdfPath, Buffer.from(pdfBuffer));
    } catch (cacheError) {
      console.warn('Failed to cache credit note PDF:', cacheError);
      // Continue without caching
    }
    
    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="storno-${order.orderNumber}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });

  } catch (error) {
    console.error('Error generating credit note:', error);
    return NextResponse.json({ error: 'Fehler beim Generieren der Storno-Rechnung' }, { status: 500 });
  }
}
