import Order from '@/lib/models/Order';
import { IReturnItem } from '@/lib/models/Return';

/**
 * Berechnet die Bonuspunkte, die bei einer Rücksendung abgezogen werden sollen
 * @param orderId - Die ID der ursprünglichen Bestellung
 * @param returnedItems - Die zurückgegebenen Artikel
 * @returns Die Anzahl der Bonuspunkte, die abgezogen werden sollen
 */
export async function calculateReturnBonusPointsDeduction(
  orderId: string, 
  returnedItems: IReturnItem[]
): Promise<number> {
  try {
    // Hole die ursprüngliche Bestellung
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Bestellung nicht gefunden');
    }

    // Berechne den Wert der zurückgegebenen Artikel
    let returnedItemsValue = 0;
    
    for (const returnedItem of returnedItems) {
      // Finde das entsprechende Item in der ursprünglichen Bestellung
      const originalItem = order.items.find(item => 
        item.productId === returnedItem.productId &&
        JSON.stringify(item.variations || {}) === JSON.stringify(returnedItem.variations || {})
      );
      
      if (originalItem) {
        // Berechne den Wert basierend auf der zurückgegebenen Menge
        // originalItem.price ist in Cent, order.subtotal ist in Euro
        const itemValue = (originalItem.price / 100) * returnedItem.quantity;
        returnedItemsValue += itemValue;
      }
    }

    // Berechne den Anteil der zurückgegebenen Artikel am Gesamtbestellwert
    // returnedItemsValue ist jetzt in Euro, order.subtotal ist auch in Euro
    const returnRatio = returnedItemsValue / order.subtotal;
    
    // Berechne die Bonuspunkte basierend auf dem Anteil der Rücksendung
    // Verwende die gleiche Formel wie bei der Bestellung: 3.5% vom Wert
    const bonusPointsToDeduct = Math.floor((returnedItemsValue * 3.5) / 100);
    
    return bonusPointsToDeduct;
  } catch (error) {
    console.error('Fehler bei der Berechnung der Bonuspunkte-Abzüge:', error);
    return 0;
  }
}

/**
 * Berechnet die Bonuspunkte, die bei einer Rücksendung gutgeschrieben werden sollen
 * @param orderId - Die ID der ursprünglichen Bestellung
 * @param returnedItems - Die zurückgegebenen Artikel
 * @returns Die Anzahl der Bonuspunkte, die gutgeschrieben werden sollen
 */
export async function calculateReturnBonusPointsCredit(
  orderId: string, 
  returnedItems: IReturnItem[]
): Promise<number> {
  try {
    // Hole die ursprüngliche Bestellung
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Bestellung nicht gefunden');
    }

    // Wenn keine Bonuspunkte eingelöst wurden, gibt es nichts gutzuschreiben
    const bonusPointsRedeemed = order.bonusPointsRedeemed || 0;
    if (bonusPointsRedeemed === 0) {
      return 0;
    }

    // Berechne den Wert der zurückgegebenen Artikel
    let returnedItemsValue = 0;
    
    for (const returnedItem of returnedItems) {
      // Finde das entsprechende Item in der ursprünglichen Bestellung
      const originalItem = order.items.find(item => 
        item.productId === returnedItem.productId &&
        JSON.stringify(item.variations || {}) === JSON.stringify(returnedItem.variations || {})
      );
      
      if (originalItem) {
        // Berechne den Wert basierend auf der zurückgegebenen Menge
        // originalItem.price ist in Cent, order.subtotal ist in Euro
        const itemValue = (originalItem.price / 100) * returnedItem.quantity;
        returnedItemsValue += itemValue;
      }
    }

    // Berechne den Anteil der zurückgegebenen Artikel am Gesamtbestellwert
    // returnedItemsValue ist jetzt in Euro, order.subtotal ist auch in Euro
    const returnRatio = returnedItemsValue / order.subtotal;
    
    // Berechne die anteiligen Bonuspunkte, die gutgeschrieben werden sollen
    const bonusPointsToCredit = Math.round(bonusPointsRedeemed * returnRatio);
    
    return bonusPointsToCredit;
  } catch (error) {
    console.error('Fehler bei der Berechnung der Bonuspunkte-Gutschrift:', error);
    return 0;
  }
}

/**
 * Zieht Bonuspunkte bei einer Rücksendung vom Benutzer ab
 * @param userId - Die ID des Benutzers
 * @param orderId - Die ID der ursprünglichen Bestellung
 * @param pointsToDeduct - Die Anzahl der Bonuspunkte, die abgezogen werden sollen
 */
export async function deductReturnBonusPoints(
  userId: string,
  orderId: string,
  pointsToDeduct: number
): Promise<void> {
  try {
    const { connectToDatabase } = await import('@/lib/mongodb');
    const User = (await import('@/lib/models/User')).default;
    
    await connectToDatabase();
    
    // Hole den Benutzer
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Benutzer nicht gefunden');
    }
    
    // Stelle sicher, dass der Benutzer genügend Bonuspunkte hat
    if (user.bonusPoints < pointsToDeduct) {
      console.warn(`Benutzer ${userId} hat nicht genügend Bonuspunkte. Verfügbar: ${user.bonusPoints}, Benötigt: ${pointsToDeduct}`);
      // Ziehe nur die verfügbaren Punkte ab
      pointsToDeduct = user.bonusPoints;
    }
    
    // Ziehe die Bonuspunkte ab
    user.bonusPoints = Math.max(0, user.bonusPoints - pointsToDeduct);
    await user.save();
    
    // Aktualisiere die Bestellung mit den abgezogenen Bonuspunkten
    const order = await Order.findById(orderId);
    if (order) {
      order.bonusPointsDeducted = (order.bonusPointsDeducted || 0) + pointsToDeduct;
      order.bonusPointsDeductedAt = new Date();
      await order.save();
    }
    
    console.log(`Bonuspunkte-Abzug erfolgreich: ${pointsToDeduct} Punkte von Benutzer ${userId} abgezogen`);
  } catch (error) {
    console.error('Fehler beim Abziehen der Bonuspunkte:', error);
    throw error;
  }
}

/**
 * Schreibt Bonuspunkte bei einer Rücksendung dem Benutzer gut
 * @param userId - Die ID des Benutzers
 * @param orderId - Die ID der ursprünglichen Bestellung
 * @param pointsToCredit - Die Anzahl der Bonuspunkte, die gutgeschrieben werden sollen
 */
export async function creditReturnBonusPoints(
  userId: string,
  orderId: string,
  pointsToCredit: number
): Promise<void> {
  try {
    const { connectToDatabase } = await import('@/lib/mongodb');
    const User = (await import('@/lib/models/User')).default;
    
    await connectToDatabase();
    
    // Hole den Benutzer
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Benutzer nicht gefunden');
    }
    
    // Schreibe die Bonuspunkte gut
    user.bonusPoints = (user.bonusPoints || 0) + pointsToCredit;
    await user.save();
    
    // Aktualisiere die Bestellung mit den gutgeschriebenen Bonuspunkten
    const order = await Order.findById(orderId);
    if (order) {
      order.bonusPointsCreditedReturn = (order.bonusPointsCreditedReturn || 0) + pointsToCredit;
      order.bonusPointsCreditedReturnAt = new Date();
      await order.save();
    }
    
    console.log(`Bonuspunkte-Gutschrift erfolgreich: ${pointsToCredit} Punkte an Benutzer ${userId} gutgeschrieben`);
  } catch (error) {
    console.error('Fehler beim Gutschreiben der Bonuspunkte:', error);
    throw error;
  }
}
