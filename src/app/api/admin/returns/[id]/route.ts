import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ReturnRequest from '@/lib/models/Return';
import { Product } from '@/lib/models/Product';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { sendReturnCompletedEmail } from '@/lib/email';
import { generateCreditNotePDF } from '@/lib/credit-note-template';
import AdminBonusPoints from '@/lib/models/AdminBonusPoints';
import { calculateReturnBonusPointsDeduction, calculateReturnBonusPointsCredit, creditReturnBonusPoints, deductReturnBonusPoints } from '@/lib/return-bonus-points';
import fs from 'fs/promises';
import path from 'path';

async function incrementStockForAcceptedItems(returnDoc: any) {
  for (const item of returnDoc.items) {
    if (!item.accepted) continue;
    const product = await Product.findOne({ slug: item.productId });
    if (!product) continue;

    if (product.variations && product.variations.length > 0 && item.variations) {
      for (const variation of product.variations) {
        const selectedValue = item.variations[variation.name];
        if (selectedValue) {
          const selectedOption = variation.options.find((opt: any) => opt.value === selectedValue);
          if (selectedOption) {
            const current = Number(selectedOption.stockQuantity || 0);
            selectedOption.stockQuantity = current + item.quantity;
            selectedOption.inStock = (selectedOption.stockQuantity || 0) > 0;
          }
        }
      }
    } else {
      const current = Number(product.stockQuantity || 0);
      product.stockQuantity = current + item.quantity;
      product.inStock = (product.stockQuantity || 0) > 0;
    }

    await product.save();
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;
    await connectToDatabase();
    const { id } = await params;
    const doc = await ReturnRequest.findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    
    // Also fetch the original order for refund calculations
    const order = await Order.findById(doc.orderId).lean();
    
    return NextResponse.json({ 
      returnRequest: doc,
      order: order || null
    });
  } catch (error) {
    console.error('Error fetching return:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireAdmin();
    if (!user) return response!;
    await connectToDatabase();

    const payload = await request.json();
    const { items, status, notes, refund } = payload as { items?: Array<{ productId: string; accepted: boolean; quantity?: number }>; status?: 'processing'|'completed'|'rejected'; notes?: string; refund?: { method?: string; reference?: string; amount?: number } };

    const { id } = await params;
    const returnDoc = await ReturnRequest.findById(id);
    if (!returnDoc) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    if (Array.isArray(items)) {
      const map = new Map(items.map(i => [i.productId, i]));
      returnDoc.items = returnDoc.items.map((it: any) => {
        const update = map.get(it.productId);
        if (update) {
          if (typeof update.accepted === 'boolean') it.accepted = update.accepted;
          if (typeof update.quantity === 'number' && update.quantity >= 0) it.quantity = Math.min(update.quantity, it.quantity);
        }
        return it;
      }) as any;
    }

    if (typeof notes === 'string') {
      returnDoc.notes = notes;
    }

    if (status) {
      returnDoc.status = status;
    }

    if (refund && typeof refund === 'object') {
      returnDoc.refund = {
        method: refund.method || returnDoc.refund?.method,
        reference: refund.reference || returnDoc.refund?.reference,
        amount: typeof refund.amount === 'number' ? refund.amount : returnDoc.refund?.amount,
      } as any;
    }

    // If completing, increment stock for accepted items and send email
    if (status === 'completed') {
      await incrementStockForAcceptedItems(returnDoc);

      // Calculate and handle bonus points for returned items
      try {
        const acceptedItems = returnDoc.items.filter((item: any) => item.accepted);
        if (acceptedItems.length > 0) {
          // Load order doc to get original order data
          const orderDoc = await Order.findById(returnDoc.orderId);
          if (!orderDoc) {
            console.error('Bestellung nicht gefunden für Rücksendung');
            return;
          }

          // Calculate the ratio of returned items to total order
          const orderSubtotalCents = orderDoc.items.reduce((s: number, it: any) => s + (Number(it.price) * Number(it.quantity)), 0);
          let returnedItemsValueCents = 0;
          
          for (const returnedItem of acceptedItems) {
            const originalItem = orderDoc.items.find((oi: any) => 
              oi.name === returnedItem.name && 
              JSON.stringify(oi.variations || {}) === JSON.stringify(returnedItem.variations || {})
            );
            
            if (originalItem) {
              returnedItemsValueCents += Number(originalItem.price) * Number(returnedItem.quantity);
            }
          }
          
          const returnRatio = orderSubtotalCents > 0 ? returnedItemsValueCents / orderSubtotalCents : 0;
          
          // Handle scheduled bonus points (not yet credited)
          if (!orderDoc.bonusPointsCredited) {
            try {
              const timer = await AdminBonusPoints.findOne({
                orderId: (orderDoc._id as any).toString(),
                bonusPointsCredited: false
              });

              if (timer) {
                const originalPoints = timer.pointsAwarded || 0;
                const pointsToDeduct = Math.round(originalPoints * returnRatio);
                const newPoints = Math.max(0, originalPoints - pointsToDeduct);

                if (newPoints <= 0) {
                  // Full return - delete the timer completely
                  await AdminBonusPoints.deleteOne({ _id: timer._id });
                  orderDoc.bonusPointsEarned = 0;
                  orderDoc.bonusPointsScheduledAt = undefined;
                  console.log(`Vollständige Rücksendung: Alle geplanten Bonuspunkte (${originalPoints}) storniert für Bestellung ${orderDoc.orderNumber}`);
                } else {
                  // Partial return - reduce points proportionally
                  timer.pointsAwarded = newPoints;
                  await timer.save();
                  orderDoc.bonusPointsEarned = newPoints;
                  console.log(`Teilweise Rücksendung: Bonuspunkte reduziert von ${originalPoints} auf ${newPoints} für Bestellung ${orderDoc.orderNumber}`);
                }
                
                await orderDoc.save();
              }
            } catch (timerErr) {
              console.error('Fehler beim Anpassen der geplanten Bonuspunkte:', timerErr);
            }
          } else {
            // Points were already credited → deduct from user balance proportionally
            const pointsToDeduct = await calculateReturnBonusPointsDeduction(
              returnDoc.orderId,
              acceptedItems
            );
            
            if (pointsToDeduct > 0) {
              await deductReturnBonusPoints(returnDoc.userId, returnDoc.orderId, pointsToDeduct);
              console.log(`Bonuspunkte-Abzug bei Rücksendung: ${pointsToDeduct} Punkte von Benutzer ${returnDoc.userId} abgezogen`);
            }
          }

          // Calculate and credit bonus points that were redeemed for this order
          const pointsToCredit = await calculateReturnBonusPointsCredit(
            returnDoc.orderId,
            acceptedItems
          );

          if (pointsToCredit > 0) {
            await creditReturnBonusPoints(returnDoc.userId, returnDoc.orderId, pointsToCredit);
            console.log(`Bonuspunkte-Gutschrift: ${pointsToCredit} Punkte für Rücksendung von Bestellung ${returnDoc.orderNumber}`);
          }
        }
      } catch (bonusPointsError) {
        console.error('Fehler bei der Bonuspunkte-Verarbeitung für Rücksendung:', bonusPointsError);
        // Fehler nicht weiterwerfen, da die Rücksendung trotzdem abgeschlossen werden soll
      }

      // fetch order to get orderNumber and user data if needed
      const order = await Order.findById(returnDoc.orderId).lean();
      
      // Fetch user data to get firstName and lastName
      const userData = await User.findById(returnDoc.userId);
      const customerName = userData?.firstName && userData?.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : returnDoc.customer?.name || 'Kunde';
      
      const acceptedItems = returnDoc.items.filter((it: any) => it.accepted).map((it: any) => ({ name: it.name, quantity: it.quantity, variations: it.variations }));
      const rejectedItems = returnDoc.items.filter((it: any) => !it.accepted).map((it: any) => ({ name: it.name, quantity: it.quantity, variations: it.variations }));
      
      // Send return completed email
      await sendReturnCompletedEmail({
        name: customerName,
        email: returnDoc.customer?.email,
        orderNumber: order?.orderNumber || returnDoc.orderNumber,
        acceptedItems,
        rejectedItems,
      });

      // Generate and send credit note if there are accepted items
      if (acceptedItems.length > 0) {
        try {
          // Prepare accepted items for credit note
          // If the original order had a discount, prorate it over items by their line totals
          const originalOrder = order; // loaded as lean earlier
          const orderItems = Array.isArray(originalOrder?.items) ? originalOrder!.items : [];
          const orderSubtotalCents = orderItems.reduce((s: number, it: any) => s + (Number(it.price) * Number(it.quantity)), 0);
          const orderDiscountCents = Number(originalOrder?.discountCents || 0);

          const findOriginalLine = (name: string, variations?: any) => {
            return orderItems.find((oi: any) => {
              const sameName = oi.name === name;
              const sameVar = JSON.stringify(oi.variations || {}) === JSON.stringify(variations || {});
              return sameName && sameVar;
            });
          };

          const creditNoteItems = acceptedItems.map((item: any) => {
            const orig = findOriginalLine(item.name, item.variations);
            const originalUnitPrice = orig ? Number(orig.price) : Number(returnDoc.items.find((it: any) => it.name === item.name)?.price || 0);
            const originalLineTotal = originalUnitPrice * item.quantity;
            
            // Calculate discount per unit for display purposes
            let discountPerUnit = 0;
            let bonusPointsDiscountPerUnit = 0;
            
            if (orderDiscountCents > 0 && orderSubtotalCents > 0 && orig) {
              const origLineTotal = Number(orig.price) * Number(orig.quantity);
              const share = Math.min(1, Math.max(0, origLineTotal / orderSubtotalCents));
              const proratedDiscount = Math.round(orderDiscountCents * share);
              discountPerUnit = Math.round(proratedDiscount / Number(orig.quantity));
            }
            
            // Calculate bonus points discount per unit
            const bonusPointsRedeemed = Number(order?.bonusPointsRedeemed || 0);
            if (bonusPointsRedeemed > 0 && orderSubtotalCents > 0 && orig) {
              const getPointsDiscountAmount = (points: number) => {
                if (points >= 5000) return 50; // 50€
                if (points >= 4000) return 35; // 35€
                if (points >= 3000) return 20; // 20€
                if (points >= 2000) return 10; // 10€
                if (points >= 1000) return 5;  // 5€
                return 0;
              };
              
              const totalPointsDiscountCents = getPointsDiscountAmount(bonusPointsRedeemed) * 100;
              const origLineTotal = Number(orig.price) * Number(orig.quantity);
              const share = Math.min(1, Math.max(0, origLineTotal / orderSubtotalCents));
              const proratedPointsDiscount = Math.round(totalPointsDiscountCents * share);
              bonusPointsDiscountPerUnit = Math.round(proratedPointsDiscount / Number(orig.quantity));
            }
            
            return {
              name: item.name,
              quantity: item.quantity,
              price: originalUnitPrice, // Show original price in table
              total: originalLineTotal, // Show original line total in table
              discountPerUnit: discountPerUnit, // Store discount for later calculation
              bonusPointsDiscountPerUnit: bonusPointsDiscountPerUnit, // Store bonus points discount
              variations: item.variations || undefined,
            };
          });

          // Generate credit note PDF
          const creditNoteDoc = await generateCreditNotePDF(order, returnDoc, creditNoteItems);
          const pdfBuffer = creditNoteDoc.output('arraybuffer');
          
          // Cache the credit note PDF
          const cacheDir = path.join(process.cwd(), 'cache', 'credit-notes');
          const pdfPath = path.join(cacheDir, `storno-${order?.orderNumber || returnDoc.orderNumber}.pdf`);
          try {
            await fs.mkdir(cacheDir, { recursive: true });
            await fs.writeFile(pdfPath, Buffer.from(pdfBuffer));
          } catch (cacheError) {
            console.warn('Failed to cache credit note PDF:', cacheError);
          }

          // Calculate total amount for credit note
          const itemsAmount = creditNoteItems.reduce((sum, item) => sum + item.total, 0);
          
          // Check if all items are being returned (for shipping refund)
          const totalSelectedQuantity = acceptedItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalOrderQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
          const isFullReturn = totalSelectedQuantity >= totalOrderQuantity;
          
          // Add shipping costs if all items are being returned
          const shippingCents = Number(order?.shippingCosts || 0);
          const shippingAmount = isFullReturn ? (shippingCents / 100) : 0;
          
          const totalAmount = itemsAmount + shippingAmount;
          
          // Default refund amount to discounted total if not explicitly provided
          // Convert totalAmount (in euros) to cents for storage
          if (!returnDoc.refund || typeof returnDoc.refund.amount !== 'number' || isNaN(returnDoc.refund.amount)) {
            (returnDoc as any).refund = { ...(returnDoc.refund || {}), amount: Math.round(totalAmount * 100) };
          }
          const creditNoteNumber = `ST-${order?.orderNumber || returnDoc.orderNumber}`;

          console.log(`Credit note generated for order ${order?.orderNumber || returnDoc.orderNumber}`);
        } catch (creditNoteError) {
          console.error('Error generating credit note:', creditNoteError);
          // Don't fail the return completion if credit note generation fails
        }
      }

      // Also set order status -> return_completed
      await Order.findByIdAndUpdate(returnDoc.orderId, { $set: { status: 'return_completed' } });
    }

    await returnDoc.save();
    return NextResponse.json({ success: true, returnRequest: returnDoc });
  } catch (error) {
    console.error('Error updating return:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


