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
import { calculateReturnBonusPointsDeduction, calculateReturnBonusPointsCredit, creditReturnBonusPoints, deductReturnBonusPoints, unfreezeBonusPointsForReturn } from '@/lib/return-bonus-points';
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
    const { items, status, notes, refund } = payload as { 
      items?: Array<{ 
        productId: string; 
        accepted: boolean; 
        quantity?: number;
        refundPercentage?: number;
        notReturned?: boolean;
      }>; 
      status?: 'processing'|'completed'|'rejected'; 
      notes?: string; 
      refund?: { method?: string; reference?: string; amount?: number } 
    };

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
          if (typeof update.refundPercentage === 'number') it.refundPercentage = update.refundPercentage;
          if (typeof update.notReturned === 'boolean') it.notReturned = update.notReturned;
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

      // Handle bonus points for different return scenarios
      try {
        const acceptedItems = returnDoc.items.filter((item: any) => item.accepted);
        const notReturnedItems = returnDoc.items.filter((item: any) => item.notReturned);
        
        // Handle items that were not returned - unfreeze and credit bonus points immediately
        if (notReturnedItems.length > 0) {
          await unfreezeBonusPointsForReturn(
            returnDoc.orderId,
            notReturnedItems,
            (returnDoc._id as any).toString()
          );
          console.log(`Bonuspunkte freigegeben für nicht zurückgegebene Artikel: ${notReturnedItems.length} Artikel`);
        }
        
        if (acceptedItems.length > 0) {
          // Load order doc to get original order data
          const orderDoc = await Order.findById(returnDoc.orderId);
          if (!orderDoc) {
            console.error('Bestellung nicht gefunden für Rücksendung');
            return;
          }

          // WICHTIG: Bei akzeptierten Artikeln (100% oder 60% Erstattung) 
          // werden KEINE weiteren Punkte abgezogen, da sie bereits beim Einfrieren abgezogen wurden!
          // Die eingefrorenen Punkte bleiben eingefroren (werden nicht gutgeschrieben)
          
          console.log(`Akzeptierte Artikel: ${acceptedItems.length} Artikel - eingefrorene Punkte bleiben eingefroren`);
          console.log(`Keine weiteren Punkte-Abzüge nötig, da bereits beim Einfrieren abgezogen`);
          
          // Nur noch die Gutschrift für eingelöste Bonuspunkte berechnen
          const pointsToCredit = await calculateReturnBonusPointsCredit(
            returnDoc.orderId,
            acceptedItems
          );

          if (pointsToCredit > 0) {
            await creditReturnBonusPoints(returnDoc.userId, returnDoc.orderId, pointsToCredit);
            console.log(`Bonuspunkte-Gutschrift für eingelöste Punkte: ${pointsToCredit} Punkte für Rücksendung von Bestellung ${returnDoc.orderNumber}`);
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

          // Get all completed returns for credit note
          const allCompletedReturnsForCreditNote = await ReturnRequest.find({ 
            orderId: returnDoc.orderId, 
            status: 'completed' 
          }).lean();

          // Prepare ALL returned items for credit note (not just current return)
          const allReturnedItemsForCreditNote: any[] = [];
          
          // Add all previously completed returns
          allCompletedReturnsForCreditNote.forEach(prevReturn => {
            prevReturn.items.forEach((item: any) => {
              if (item.accepted) {
                allReturnedItemsForCreditNote.push({
                  name: item.name,
                  quantity: item.quantity,
                  variations: item.variations,
                  price: item.price
                });
              }
            });
          });
          
          // Add current return items
          acceptedItems.forEach((item: any) => {
            const orig = findOriginalLine(item.name, item.variations);
            const originalUnitPrice = orig ? Number(orig.price) : Number(returnDoc.items.find((it: any) => it.name === item.name)?.price || 0);
            allReturnedItemsForCreditNote.push({
              name: item.name,
              quantity: item.quantity,
              variations: item.variations,
              price: originalUnitPrice
            });
          });

          const creditNoteItems = allReturnedItemsForCreditNote.map((item: any) => {
            const orig = findOriginalLine(item.name, item.variations);
            const originalUnitPrice = orig ? Number(orig.price) : item.price;
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
          
          // Cache the credit note PDF with timestamp to ensure it's always updated
          const cacheDir = path.join(process.cwd(), 'cache', 'credit-notes');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const pdfPath = path.join(cacheDir, `storno-${order?.orderNumber || returnDoc.orderNumber}-${timestamp}.pdf`);
          const latestPdfPath = path.join(cacheDir, `storno-${order?.orderNumber || returnDoc.orderNumber}-latest.pdf`);
          try {
            await fs.mkdir(cacheDir, { recursive: true });
            await fs.writeFile(pdfPath, Buffer.from(pdfBuffer));
            // Also create a "latest" version for easy access
            await fs.writeFile(latestPdfPath, Buffer.from(pdfBuffer));
          } catch (cacheError) {
            console.warn('Failed to cache credit note PDF:', cacheError);
          }

          // Calculate total amount for credit note based on refund percentages
          const itemsAmount = creditNoteItems.reduce((sum, item) => {
            const refundPercentage = returnDoc.items.find((ri: any) => 
              ri.name === item.name && 
              JSON.stringify(ri.variations || {}) === JSON.stringify(item.variations || {})
            )?.refundPercentage || 100;
            
            return sum + (item.total * (refundPercentage / 100));
          }, 0);
          
          // Get all completed returns for this order to calculate total returned quantity
          const allCompletedReturns = await ReturnRequest.find({ 
            orderId: returnDoc.orderId, 
            status: 'completed' 
          }).lean();
          
          // Check if all items are being returned (for shipping refund)
          // This includes all previous returns plus current return
          const totalSelectedQuantity = acceptedItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalOrderQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
          
          // Calculate total returned quantity across all completed returns
          let totalReturnedQuantity = 0;
          allCompletedReturns.forEach(returnDoc => {
            returnDoc.items.forEach((item: any) => {
              if (item.accepted) {
                totalReturnedQuantity += item.quantity;
              }
            });
          });
          
          const isFullReturn = totalReturnedQuantity >= totalOrderQuantity;
          
          // Add shipping costs if all items are being returned (including previous returns)
          const shippingCents = Number(order?.shippingCosts || 0);
          const shippingAmount = isFullReturn ? (shippingCents / 100) : 0;
          
          const totalAmount = itemsAmount + shippingAmount;
          
          // Default refund amount to calculated total if not explicitly provided
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

      // Determine final order status based on whether all items are returned
      const orderDoc = await Order.findById(returnDoc.orderId);
      if (!orderDoc) {
        console.error('Order not found for return completion');
        return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
      }

      // Get all completed returns for this order to calculate total returned quantity
      const allCompletedReturns = await ReturnRequest.find({ 
        orderId: returnDoc.orderId, 
        status: 'completed' 
      }).lean();
      
      // Also include the current return if it's being completed
      if (status === 'completed') {
        const currentReturnExists = allCompletedReturns.some(r => r._id.toString() === (returnDoc._id as any).toString());
        if (!currentReturnExists) {
          allCompletedReturns.push({
            ...returnDoc.toObject(),
            _id: returnDoc._id as any,
            items: returnDoc.items.filter((item: any) => item.accepted)
          } as any);
        }
      }
      
      console.log(`Order ${orderDoc.orderNumber}: Found ${allCompletedReturns.length} completed returns:`, allCompletedReturns.map(r => `${r._id} (${r.items.map(i => `${i.name} x${i.quantity}`).join(', ')})`));
      
      // Calculate total returned quantity across all returns
      let totalReturnedQuantity = 0;
      allCompletedReturns.forEach(returnDoc => {
        returnDoc.items.forEach((item: any) => {
          if (item.accepted) {
            totalReturnedQuantity += item.quantity;
          }
        });
      });
      
      // Note: totalReturnedQuantity already includes current return if it was added to allCompletedReturns
      // So we don't need to add currentReturnQuantity again
      const totalWithCurrent = totalReturnedQuantity;
      
      // Calculate total original quantity
      const totalOriginalQuantity = orderDoc.items.reduce((sum, item) => sum + item.quantity, 0);
      
      console.log(`Order ${orderDoc.orderNumber}: Quantity calculation debug:`, {
        totalReturnedQuantity,
        totalWithCurrent,
        totalOriginalQuantity,
        isComplete: totalWithCurrent >= totalOriginalQuantity
      });
      
      // Update returnedItems array in order
      const returnedItems: any[] = [];
      allCompletedReturns.forEach(returnDoc => {
        returnDoc.items.forEach((item: any) => {
          if (item.accepted) {
            returnedItems.push({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              variations: item.variations,
              returnRequestId: returnDoc._id.toString(),
              returnedAt: returnDoc.updatedAt
            });
          }
        });
      });
      
      console.log(`Order ${orderDoc.orderNumber}: Updating returnedItems with ${returnedItems.length} items:`, returnedItems.map(item => `${item.name} x${item.quantity}`));
      
      // Set order status based on whether all items are returned
      const finalStatus = totalWithCurrent >= totalOriginalQuantity ? 'return_completed' : 'partially_returned';
      
      console.log(`Order ${orderDoc.orderNumber}: Setting status to ${finalStatus} (totalWithCurrent: ${totalWithCurrent}, totalOriginalQuantity: ${totalOriginalQuantity})`);
      
      await Order.findByIdAndUpdate(returnDoc.orderId, { 
        $set: { 
          status: finalStatus,
          returnedItems: returnedItems
        } 
      });
      
      console.log(`Order ${orderDoc.orderNumber}: Successfully updated with ${returnedItems.length} returned items`);
    }

    await returnDoc.save();
    return NextResponse.json({ success: true, returnRequest: returnDoc });
  } catch (error) {
    console.error('Error updating return:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


