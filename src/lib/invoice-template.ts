import jsPDF from 'jspdf';
import { LOGO_BASE64 } from './logo-base64';

export async function generateInvoicePDF(
  order: any,
  doc: jsPDF,
  options?: { logoBase64?: string; title?: string; legalNote?: string }
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 20;
  const rightMargin = 20;
  const topMargin = 20;
  const bottomMargin = 22;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const safeString = (value: any) => (value === undefined || value === null ? '' : String(value));

  const formatPaymentMethod = (method: string) => {
    const paymentMethods: { [key: string]: string } = {
      'bank': 'Banküberweisung',
      'paypal': 'PayPal',
      'creditcard': 'Kreditkarte',
      'sepa': 'SEPA-Lastschrift',
      'klarna': 'Klarna',
      'stripe': 'Stripe',
      'cash': 'Barzahlung',
      'invoice': 'Rechnung'
    };
    return paymentMethods[method.toLowerCase()] || method;
  };

  const drawSeparator = (y: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, y, pageWidth - rightMargin, y);
  };

  const drawSectionLabel = (text: string, x: number, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(text, x, y);
    doc.setTextColor(0, 0, 0);
  };

  const drawKeyValue = (label: string, value: string, x: number, y: number, labelWidth = 30) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${label}:`, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(value || '-', x + labelWidth, y);
  };

  let cursorY = topMargin;

  // Resolve options
  const providedLogoBase64 = options?.logoBase64;
  const titleText = options?.title || 'Rechnung';
  const legalNoteOverride = options?.legalNote;

  // Header: Logo and Company name
  try {
    if (providedLogoBase64) {
      // Option 1: Base64 als Parameter übergeben
      const dataUrl = `data:image/png;base64,${providedLogoBase64}`;
      doc.addImage(dataUrl, 'PNG', leftMargin, cursorY - 5, 20, 20);
    } else if (LOGO_BASE64 && LOGO_BASE64 !== 'IHR_BASE64_STRING_HIER_EINFÜGEN') {
      // Option 2: Logo aus separater Datei laden
      let dataUrl: string;
      if (LOGO_BASE64.startsWith('data:image/')) {
        // Falls bereits Data-URL Format
        dataUrl = LOGO_BASE64;
      } else {
        // Falls nur Base64-String
        dataUrl = `data:image/png;base64,${LOGO_BASE64}`;
      }
      doc.addImage(dataUrl, 'PNG', leftMargin, cursorY - 5, 20, 20);
    } else {
      // Option 3: Logo von URL laden (Fallback)
      const logoUrl = 'https://backkutsche.de/images/logo.webp';
      const response = await fetch(logoUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:image/webp;base64,${base64}`;
        doc.addImage(dataUrl, 'WEBP', leftMargin, cursorY - 5, 20, 20);
      } else {
        throw new Error('Failed to fetch logo');
      }
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20); // Größere Schrift
    doc.setTextColor(0, 0, 0);
    doc.text('3DarterDE', leftMargin, cursorY + 22); // Text etwas höher
  } catch (error) {
    // Fallback: Just company name without logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text('3DarterDE', leftMargin, cursorY + 5);
  }
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10); // Etwas größere Schrift für Adresse
  cursorY += 32; // Angepasster Abstand mit Logo
  doc.text('Raduhner Str. 67', leftMargin, cursorY);
  cursorY += 5;
  doc.text('12355 Berlin, Deutschland', leftMargin, cursorY);
  cursorY += 5;
  doc.text('E-Mail: service@3darter.de', leftMargin, cursorY);

  // Header: Invoice title and meta box on the right
  const metaBoxWidth = 90;
  const metaBoxX = pageWidth - rightMargin - metaBoxWidth;
  const metaTop = topMargin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(titleText, metaBoxX, metaTop);

  // Meta box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(246, 246, 246);
  const metaBoxY = metaTop + 6;
  const metaBoxHeight = 28;
  doc.rect(metaBoxX, metaBoxY, metaBoxWidth, metaBoxHeight, 'FD');

  const createdAt = new Date(order.createdAt);
  const invoiceNumber = safeString(order.orderNumber);
  const paymentMethod = safeString(order.paymentMethod);
  const paymentStatus = safeString(order.paymentStatus || 'paid');

  let metaLineY = metaBoxY + 7;
  drawKeyValue('Rechnungsnr.', invoiceNumber, metaBoxX + 4, metaLineY);
  metaLineY += 6;
  drawKeyValue('Datum', createdAt.toLocaleDateString('de-DE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  }), metaBoxX + 4, metaLineY);
  metaLineY += 6;
  const displayPaymentMethod = paymentMethod ? formatPaymentMethod(paymentMethod) : '';
  drawKeyValue('Zahlung', displayPaymentMethod ? `${displayPaymentMethod} (${paymentStatus})` : paymentStatus, metaBoxX + 4, metaLineY);

  cursorY = Math.max(cursorY + 8, metaBoxY + metaBoxHeight + 6);
  drawSeparator(cursorY);
  cursorY += 8;

  // Addresses
  const billingAddress = order.billingAddress || order.shippingAddress || {};
  const shippingAddress = order.shippingAddress || {};

  const addressColumnWidth = (contentWidth - 8) / 2; // gap 8mm
  const col1X = leftMargin;
  const col2X = leftMargin + addressColumnWidth + 8;

  drawSectionLabel('Rechnung an', col1X, cursorY);
  drawSectionLabel('Lieferadresse', col2X, cursorY);
  cursorY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const buildAddressLines = (addr: any) => {
    const firstName = addr?.firstName || '';
    const lastName = addr?.lastName || '';
    const nameLine = `${firstName} ${lastName}`.trim() || null;

    const companyLine = addr?.company ? String(addr.company) : null;

    const street = addr?.street || '';
    const houseNumber = addr?.houseNumber || '';
    const streetLine = `${street} ${houseNumber}`.trim();

    const restLines: string[] = [];
    if (streetLine) restLines.push(streetLine);
    if (addr?.addressLine2) restLines.push(String(addr.addressLine2));
    const postalCode = addr?.postalCode || '';
    const city = addr?.city || '';
    const cityLine = `${postalCode} ${city}`.trim();
    if (cityLine) restLines.push(cityLine);
    if (addr?.country) restLines.push(String(addr.country));

    return { nameLine, companyLine, restLines };
  };

  const billing = buildAddressLines(billingAddress);
  const shipping = buildAddressLines(shippingAddress);

  let tmpY = cursorY;
  if (billing.companyLine) { doc.setFont('helvetica', 'bold'); doc.text(billing.companyLine, col1X, tmpY); tmpY += 5; }
  if (billing.nameLine) { doc.setFont('helvetica', 'normal'); doc.text(billing.nameLine, col1X, tmpY); tmpY += 5; }
  doc.setFont('helvetica', 'normal');
  billing.restLines.forEach((line: string) => { doc.text(line, col1X, tmpY); tmpY += 5; });

  tmpY = cursorY;
  if (shipping.companyLine) { doc.setFont('helvetica', 'bold'); doc.text(shipping.companyLine, col2X, tmpY); tmpY += 5; }
  if (shipping.nameLine) { doc.setFont('helvetica', 'normal'); doc.text(shipping.nameLine, col2X, tmpY); tmpY += 5; }
  doc.setFont('helvetica', 'normal');
  shipping.restLines.forEach((line: string) => { doc.text(line, col2X, tmpY); tmpY += 5; });

  const leftBlockHeight = (billing.nameLine ? 5 : 0) + (billing.companyLine ? 5 : 0) + billing.restLines.length * 5;
  const rightBlockHeight = (shipping.nameLine ? 5 : 0) + (shipping.companyLine ? 5 : 0) + shipping.restLines.length * 5;
  cursorY += Math.max(leftBlockHeight, rightBlockHeight) + 8;
  drawSeparator(cursorY);
  cursorY += 6;

  // Items table
  const table = {
    colPos: leftMargin,
    colDesc: leftMargin + 12,
    colUnit: pageWidth - rightMargin - 74,
    colQty: pageWidth - rightMargin - 44,
    colTotal: pageWidth - rightMargin - 20,
    rowHeight: 8
  };

  const drawTableHeader = () => {
    doc.setFillColor(246, 246, 246);
    doc.setDrawColor(220, 220, 220);
    doc.rect(leftMargin, cursorY - 6, contentWidth, 9, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text('Pos', table.colPos, cursorY);
    doc.text('Artikel / Variante', table.colDesc, cursorY);
    doc.text('Einzelpreis', table.colUnit, cursorY, { align: 'right' });
    doc.text('Menge', table.colQty, cursorY, { align: 'right' });
    doc.text('Gesamt', table.colTotal, cursorY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    cursorY += 4;
    drawSeparator(cursorY);
    cursorY += 4;
  };

  const ensureSpace = (minSpace: number) => {
    if (cursorY + minSpace <= pageHeight - bottomMargin) return;
    // Footer page number before adding new page will be drawn later globally
    doc.addPage();
    cursorY = topMargin;
    drawTableHeader();
  };

  drawTableHeader();

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  let computedSubtotal = 0;

  items.forEach((item, index) => {
    const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
    computedSubtotal += lineTotal / 100; // Convert to euros for calculation

    const positionText = String(index + 1);
    const nameText = safeString(item.name) || '-';
    const variationsText = item.variations && Object.keys(item.variations || {}).length > 0
      ? Object.entries(item.variations)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
      : '';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const descriptionMaxWidth = table.colUnit - table.colDesc - 6;
    const nameLines = doc.splitTextToSize(nameText, descriptionMaxWidth);
    const variationLines = variationsText ? doc.splitTextToSize(variationsText, descriptionMaxWidth) : [] as string[];
    const rowTextLines = nameLines.concat(variationLines);
    const rowHeight = Math.max(table.rowHeight, rowTextLines.length * 5);

    ensureSpace(rowHeight + 6);

    // Position
    doc.text(positionText, table.colPos, cursorY);

    // Description
    let descY = cursorY;
    doc.setFont('helvetica', 'bold');
    if (nameLines.length > 0) {
      doc.text(nameLines[0], table.colDesc, descY);
      descY += 5;
      for (let i = 1; i < nameLines.length; i++) {
        doc.setFont('helvetica', 'normal');
        doc.text(nameLines[i], table.colDesc, descY);
        descY += 5;
      }
    }
    if (variationLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      variationLines.forEach((line: string) => { doc.text(line, table.colDesc, descY); descY += 5; });
    }

    // Unit price
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency((Number(item.price) || 0) / 100), table.colUnit, cursorY, { align: 'right' });

    // Quantity
    doc.text(String(Number(item.quantity) || 0), table.colQty, cursorY, { align: 'right' });

    // Line total
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(lineTotal / 100), table.colTotal, cursorY, { align: 'right' });

    cursorY += rowHeight;
    drawSeparator(cursorY + 2);
    cursorY += 6;
  });

  const orderTotal = Number(order.total) || computedSubtotal;
  const discountCents = Number(order.discountCents) || 0;
  const discountCode = order.discountCode ? String(order.discountCode) : '';
  
  // Use actual shipping costs from order or calculate them
  const shippingCosts = (order.shippingCosts || 0) / 100; // Convert from cents to euros
  const subtotal = order.subtotal || computedSubtotal;
  
  // Calculate bonus points discount
  const getPointsDiscountAmount = (points: number) => {
    if (points >= 5000) return 50; // 50€
    if (points >= 4000) return 35; // 35€
    if (points >= 3000) return 20; // 20€
    if (points >= 2000) return 10; // 10€
    if (points >= 1000) return 5;  // 5€
    return 0;
  };
  
  const bonusPointsRedeemed = order.bonusPointsRedeemed || 0;
  // Prefer explicit cents override (e.g., for credit notes with prorated points)
  const pointsDiscountCentsOverride = typeof (order as any).pointsDiscountOverrideCents === 'number'
    ? Number((order as any).pointsDiscountOverrideCents)
    : null;
  const pointsDiscount = getPointsDiscountAmount(bonusPointsRedeemed);
  const pointsDiscountCents = pointsDiscountCentsOverride !== null
    ? pointsDiscountCentsOverride
    : Math.round(pointsDiscount * 100);
  const finalTotal = orderTotal;

  // Totals block (right aligned)
  ensureSpace(50);
  const totalsBoxWidth = 80;
  const totalsX = pageWidth - rightMargin - totalsBoxWidth;
  const totalsY = cursorY;

  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(250, 250, 250);
  // Adjust box height based on optional discount and bonus points lines
  const extraLinesCount = (discountCents > 0 ? 1 : 0) + (bonusPointsRedeemed > 0 && pointsDiscountCents > 0 ? 1 : 0);
  const totalsBoxHeight = 40 + (extraLinesCount * 6);
  doc.rect(totalsX, totalsY, totalsBoxWidth, totalsBoxHeight, 'FD');

  let lineY = totalsY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Zwischensumme', totalsX + 6, lineY);
  doc.text(formatCurrency(subtotal), totalsX + totalsBoxWidth - 6, lineY, { align: 'right' });
  lineY += 6;
  
  // Shipping costs - only show if shippingCosts is not null and > 0
  if (order.shippingCosts !== null && shippingCosts > 0) {
    doc.text('Versandkosten', totalsX + 6, lineY);
    doc.text(formatCurrency(shippingCosts), totalsX + totalsBoxWidth - 6, lineY, { align: 'right' });
    lineY += 6;
  } else if (order.shippingCosts !== null) {
    doc.text('Versandkosten', totalsX + 6, lineY);
    doc.text('kostenlos', totalsX + totalsBoxWidth - 6, lineY, { align: 'right' });
    lineY += 6;
  }
  // If shippingCosts is null, skip the shipping line entirely
  
  // Discount line when present
  if (discountCents > 0) {
    const label = discountCode ? `Rabatt (${discountCode})` : 'Rabatt';
    doc.text(label, totalsX + 6, lineY);
    doc.setTextColor(0, 150, 0);
    doc.text(`-${formatCurrency(discountCents / 100)}`, totalsX + totalsBoxWidth - 6, lineY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    lineY += 6;
  }
  
  // Bonus points discount
  if (bonusPointsRedeemed > 0 && pointsDiscountCents > 0) {
    const bonusLabel = pointsDiscountCentsOverride !== null
      ? 'Bonuspunkte-Rabatt'
      : `Bonuspunkte-Rabatt (${bonusPointsRedeemed} Pkt.)`;
    doc.text(bonusLabel, totalsX + 6, lineY);
    doc.setTextColor(0, 150, 0); // Green color for discount
    doc.text(`-${formatCurrency(pointsDiscountCents / 100)}` , totalsX + totalsBoxWidth - 6, lineY, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Reset to black
    lineY += 6;
  }
  
  // TODO: Umsatzsteuer für später vorbereitet
  // doc.text('Umsatzsteuer (0%)', totalsX + 6, lineY);
  // doc.text(formatCurrency(0), totalsX + totalsBoxWidth - 6, lineY, { align: 'right' });
  // lineY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Rechnungsbetrag', totalsX + 6, lineY);
  doc.text(formatCurrency(finalTotal), totalsX + totalsBoxWidth - 6, lineY, { align: 'right' });

  // Legal note (Kleinunternehmerregelung) direkt unter der Rechnungsbetrag-Box
  lineY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const legalNote = legalNoteOverride || 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).';
  const legalLines = doc.splitTextToSize(legalNote, totalsBoxWidth - 12);
  doc.text(legalLines, totalsX + 6, lineY);
  doc.setTextColor(0, 0, 0);

  cursorY = Math.max(cursorY + 50, lineY + 20);

  // Thank you note
  ensureSpace(10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Vielen Dank für Ihren Einkauf!', leftMargin, cursorY);
  cursorY += 8;

  // Footer
  const addFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const footerY = pageHeight - 20;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, footerY - 8, pageWidth - rightMargin, footerY - 8);

    const colW = contentWidth / 3;
    const col1X = leftMargin;
    const col2X = leftMargin + colW;
    const col3X = leftMargin + 2 * colW;

    // Anbieter Spalte
    doc.setFont('helvetica', 'bold');
    doc.text('Anbieter', col1X, footerY - 2);
    doc.setFont('helvetica', 'normal');
    doc.text('3DarterDE', col1X, footerY + 4);
    doc.text('Raduhner Str. 67', col1X, footerY + 8);
    doc.text('12355 Berlin', col1X, footerY + 12);
    doc.text('Deutschland', col1X, footerY + 16);

    // Kontakt Spalte
    doc.setFont('helvetica', 'bold');
    doc.text('Kontakt', col2X, footerY - 2);
    doc.setFont('helvetica', 'normal');
    doc.text('E-Mail: service@3darter.de', col2X, footerY + 4);
    doc.text('Website: 3darter.de', col2X, footerY + 8);

    // Bank Spalte
    doc.setFont('helvetica', 'bold');
    doc.text('Bankverbindung', col3X, footerY - 2);
    doc.setFont('helvetica', 'normal');
    doc.text('Musterbank', col3X, footerY + 4);
    doc.text('IBAN: DE07123412341234123412', col3X, footerY + 8);
    doc.text('BIC: BELADEBEXXX', col3X, footerY + 12);
  };

  // Add page numbers and footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const pageText = `${i} / ${totalPages}`;
    doc.text(pageText, pageWidth / 2, pageHeight - 2, { align: 'center' });
  }
}