import jsPDF from 'jspdf';
import { generateInvoicePDF } from './invoice-template';

export interface CreditNoteItem {
  name: string;
  quantity: number;
  price: number; // in cents
  total: number; // in cents
  discountPerUnit?: number; // in cents
  bonusPointsDiscountPerUnit?: number; // in cents
  variations?: Record<string, string>;
}

export async function generateCreditNotePDF(
  order: any,
  returnRequest: any,
  acceptedItems: CreditNoteItem[]
): Promise<jsPDF> {
  const doc = new jsPDF();

  // Calculate total discount for credit note
  const totalDiscountCents = acceptedItems.reduce((sum, it) => {
    return sum + ((it.discountPerUnit || 0) * it.quantity);
  }, 0);
  
  // Calculate total bonus points discount for credit note
  const totalBonusPointsDiscountCents = acceptedItems.reduce((sum, it) => {
    return sum + ((it.bonusPointsDiscountPerUnit || 0) * it.quantity);
  }, 0);
  
  // Calculate final total after all discounts
  const originalSubtotal = acceptedItems.reduce((sum, it) => sum + (it.total / 100), 0);
  
  // Check if all items are being returned (for shipping refund)
  // This includes all previous returns plus current return
  const totalSelectedQuantity = acceptedItems.reduce((sum, it) => sum + it.quantity, 0);
  const totalOrderQuantity = order.items.reduce((sum: number, it: any) => sum + it.quantity, 0);
  
  // Import ReturnRequest to check all completed returns
  const { default: ReturnRequest } = await import('@/lib/models/Return');
  
  // Get all completed returns for this order to calculate total returned quantity
  const allCompletedReturns = await ReturnRequest.find({ 
    orderId: order._id.toString(), 
    status: 'completed' 
  }).lean();
  
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
  const shippingCents = Number(order.shippingCosts || 0);
  const shippingAmount = isFullReturn ? (shippingCents / 100) : 0;
  
  const finalTotal = originalSubtotal - (totalDiscountCents / 100) - (totalBonusPointsDiscountCents / 100) + shippingAmount;

  // Clone order and override fields to reflect a credit note using the same layout
  const creditOrder = {
    ...order,
    items: acceptedItems.map((it, idx) => ({
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      variations: it.variations || undefined,
    })),
    // Subtotal and total are expressed in euros within invoice template computations
    subtotal: originalSubtotal, // Show original subtotal
    total: finalTotal, // Show final total after discount and including shipping
    discountCents: totalDiscountCents, // Pass discount for display
    bonusPointsRedeemed: order.bonusPointsRedeemed, // Pass bonus points for display
    pointsDiscountOverrideCents: totalBonusPointsDiscountCents, // Prorated bonus points discount for display
    shippingCosts: shippingCents, // Always show original shipping costs
    shippingRefundCents: isFullReturn ? shippingCents : 0, // Only refund shipping costs for full returns
  } as any;

  // Use the invoice template with custom title and legal note
  await generateInvoicePDF(creditOrder, doc, {
    title: 'Storno-Rechnung',
    legalNote: 'Diese Storno-Rechnung korrigiert die ursprüngliche Rechnung und dient als Nachweis für die Rückabwicklung. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).'
  });

  return doc;
}
