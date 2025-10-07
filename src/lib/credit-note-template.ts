import jsPDF from 'jspdf';
import { generateInvoicePDF } from './invoice-template';

export interface CreditNoteItem {
  name: string;
  quantity: number;
  price: number; // in cents
  total: number; // in cents
  variations?: Record<string, string>;
}

export async function generateCreditNotePDF(
  order: any,
  returnRequest: any,
  acceptedItems: CreditNoteItem[]
): Promise<jsPDF> {
  const doc = new jsPDF();

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
    subtotal: acceptedItems.reduce((sum, it) => sum + (it.total / 100), 0),
    total: acceptedItems.reduce((sum, it) => sum + (it.total / 100), 0),
    shippingCosts: null, // Remove shipping costs from credit note
  } as any;

  // Use the invoice template with custom title and legal note
  await generateInvoicePDF(creditOrder, doc, {
    title: 'Storno-Rechnung',
    legalNote: 'Diese Storno-Rechnung korrigiert die ursprüngliche Rechnung und dient als Nachweis für die Rückabwicklung. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).'
  });

  return doc;
}
