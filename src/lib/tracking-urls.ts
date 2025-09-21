export function getTrackingUrl(shippingProvider: string, trackingNumber: string): string | null {
  const cleanTrackingNumber = trackingNumber.trim();
  
  switch (shippingProvider.toLowerCase()) {
    case 'dhl':
      return `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${cleanTrackingNumber}`;
    
    case 'hermes':
      return `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation#${cleanTrackingNumber}`;
    
    case 'dpd':
      return `https://tracking.dpd.de/status/de_DE/parcellifecycle?parcelNumber=${cleanTrackingNumber}`;
    
    case 'ups':
      return `https://www.ups.com/track?trackingNumber=${cleanTrackingNumber}`;
    
    case 'fedex':
      return `https://www.fedex.com/fedextrack/?trknbr=${cleanTrackingNumber}`;
    
    case 'gls':
      return `https://gls-group.eu/DE/de/paketverfolgung?match=${cleanTrackingNumber}`;
    
    case 'other':
    default:
      return null;
  }
}

export function getTrackingProviderName(shippingProvider: string): string {
  switch (shippingProvider.toLowerCase()) {
    case 'dhl':
      return 'DHL';
    case 'hermes':
      return 'Hermes';
    case 'dpd':
      return 'DPD';
    case 'ups':
      return 'UPS';
    case 'fedex':
      return 'FedEx';
    case 'gls':
      return 'GLS';
    case 'other':
    default:
      return 'Unbekannt';
  }
}
