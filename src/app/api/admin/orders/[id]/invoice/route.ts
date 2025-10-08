import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import jsPDF from 'jspdf';
import { promises as fs } from 'fs';
import path from 'path';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { generateInvoicePDF } from '@/lib/invoice-template';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    // Rate limiting: 20 PDF downloads per minute per admin
    const clientIP = getClientIP(request);
    const rateLimitKey = `admin-invoice-${clientIP}`;
    const rateLimitResult = rateLimit(rateLimitKey, 20, 60 * 1000);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      );
    }

    const { id } = await params;
    
    await connectToDatabase();

    // Find the order by either MongoDB _id or orderNumber
    let order;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // If it's a MongoDB ObjectId (24 hex characters)
      order = await Order.findById(id);
    } else {
      // If it's an orderNumber
      order = await Order.findOne({ orderNumber: id });
    }
    if (!order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    // Only allow invoice download for delivered orders or completed returns
    if (order.status !== 'delivered' && order.status !== 'return_completed') {
      return NextResponse.json({ error: 'Rechnung nur für gelieferte Bestellungen oder abgeschlossene Rücksendungen verfügbar' }, { status: 400 });
    }

    // Check if PDF already exists in cache
    const cacheDir = path.join(process.cwd(), 'cache', 'invoices');
    const pdfPath = path.join(cacheDir, `rechnung-${order.orderNumber}.pdf`);
    
    try {
      // Try to read cached PDF
      const cachedPdf = await fs.readFile(pdfPath);
      
      // Return cached PDF
      return new NextResponse(cachedPdf as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="rechnung-${order.orderNumber}.pdf"`,
          'Content-Length': cachedPdf.length.toString(),
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      });
    } catch (error) {
      // PDF not cached, generate new one
    }

    // Create PDF
    const doc = new jsPDF();
    
    // Generate invoice using template
    await generateInvoicePDF(order, doc);

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');
    
    // Cache the PDF for future requests
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(pdfPath, Buffer.from(pdfBuffer));
    } catch (cacheError) {
      console.warn('Failed to cache PDF:', cacheError);
      // Continue without caching
    }
    
    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rechnung-${order.orderNumber}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Fehler beim Generieren der Rechnung' },
      { status: 500 }
    );
  }
}
