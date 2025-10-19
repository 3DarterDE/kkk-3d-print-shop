import Order from '@/lib/models/Order';
import { IReturnItem } from '@/lib/models/Return';
import { AdminBonusPoints } from '@/lib/models/AdminBonusPoints';

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

/**
 * Berechnet die Bonuspunkte für einen einzelnen Artikel (3.5% vom Artikelwert)
 * @param itemPriceCents - Preis des Artikels in Cent
 * @returns Anzahl der Bonuspunkte
 */
export function calculateItemBonusPoints(itemPriceCents: number): number {
  return Math.floor((itemPriceCents / 100) * 3.5);
}

/**
 * Friert Bonuspunkte für eine Rücksendung ein
 * @param orderId - Die ID der Bestellung
 * @param returnItems - Die zurückgesendeten Artikel
 * @param returnRequestId - Die ID der Rücksendungsanfrage
 */
export async function freezeBonusPointsForReturn(
  orderId: string,
  returnItems: IReturnItem[],
  returnRequestId: string
): Promise<void> {
  try {
    console.log(`DEBUG: freezeBonusPointsForReturn aufgerufen für Order ${orderId}, Return ${returnRequestId}`);
    console.log(`DEBUG: Return Items:`, returnItems.map(item => ({ name: item.name, price: item.price, quantity: item.quantity, frozenPoints: item.frozenBonusPoints })));
    
    const { connectToDatabase } = await import('@/lib/mongodb');
    await connectToDatabase();
    
    // Finde den AdminBonusPoints Timer für diese Bestellung (auch wenn bereits gutgeschrieben)
    const timer = await AdminBonusPoints.findOne({
      orderId: orderId
    });
    
    console.log(`DEBUG: Timer gefunden:`, timer ? { orderId: timer.orderId, pointsAwarded: timer.pointsAwarded, bonusPointsCredited: timer.bonusPointsCredited } : 'Kein Timer gefunden');
    
    if (!timer) {
      console.log(`Kein Timer gefunden für Bestellung ${orderId}`);
      return;
    }
    
    let totalFrozenPoints = 0;
    
    // Berechne eingefrorene Punkte für jeden Artikel
    for (const item of returnItems) {
      const itemBonusPoints = calculateItemBonusPoints(item.price) * item.quantity;
      totalFrozenPoints += itemBonusPoints;
      console.log(`DEBUG: Item ${item.name}: ${item.price} Cent * ${item.quantity} = ${itemBonusPoints} Punkte`);
    }
    
    console.log(`DEBUG: Gesamt eingefrorene Punkte: ${totalFrozenPoints}`);
    
    if (totalFrozenPoints > 0) {
      // Prüfe ob Timer bereits abgelaufen und Punkte gutgeschrieben wurden
      if (timer.bonusPointsCredited) {
        console.log(`Timer für Bestellung ${orderId} bereits abgelaufen und gutgeschrieben. Ziehe Punkte direkt vom User ab.`);
        
        // Ziehe die Punkte direkt vom User ab
        const User = (await import('@/lib/models/User')).default;
        const user = await User.findById(timer.userId);
        if (user) {
          user.bonusPoints = Math.max(0, (user.bonusPoints || 0) - totalFrozenPoints);
          await user.save();
          console.log(`Bonuspunkte direkt vom User abgezogen: ${totalFrozenPoints} Punkte`);
        }
        
        // Aktualisiere die Order
        const order = await Order.findById(orderId);
        if (order) {
          order.bonusPointsEarned = Math.max(0, order.bonusPointsEarned - totalFrozenPoints);
          order.bonusPointsDeducted = (order.bonusPointsDeducted || 0) + totalFrozenPoints;
          order.bonusPointsDeductedAt = new Date();
          await order.save();
          console.log(`Order ${order.orderNumber}: bonusPointsEarned reduziert um ${totalFrozenPoints} auf ${order.bonusPointsEarned}`);
        }
      } else {
        // Timer noch nicht abgelaufen - normale Einfrierung
        console.log(`DEBUG: Timer noch nicht abgelaufen. Führe normale Einfrierung durch.`);
        console.log(`DEBUG: Vor Einfrierung - pointsAwarded: ${timer.pointsAwarded}, frozenPoints: ${timer.frozenPoints || 0}`);
        
        timer.pointsAwarded = Math.max(0, timer.pointsAwarded - totalFrozenPoints);
        
        // Füge zu eingefrorenen Punkten hinzu
        timer.frozenPoints = (timer.frozenPoints || 0) + totalFrozenPoints;
        
        // Füge Return Request ID hinzu
        if (!timer.frozenBy) {
          timer.frozenBy = [];
        }
        timer.frozenBy.push(returnRequestId);
        
        await timer.save();
        
        console.log(`DEBUG: Nach Einfrierung - pointsAwarded: ${timer.pointsAwarded}, frozenPoints: ${timer.frozenPoints}`);
        
        // WICHTIG: Auch die Order selbst aktualisieren
        const order = await Order.findById(orderId);
        if (order) {
          console.log(`DEBUG: Order vor Update - bonusPointsEarned: ${order.bonusPointsEarned}`);
          order.bonusPointsEarned = Math.max(0, order.bonusPointsEarned - totalFrozenPoints);
          await order.save();
          console.log(`Order ${order.orderNumber}: bonusPointsEarned reduziert um ${totalFrozenPoints} auf ${order.bonusPointsEarned}`);
        }
        
        console.log(`Bonuspunkte eingefroren: ${totalFrozenPoints} Punkte für Rücksendung ${returnRequestId}`);
      }
    }
  } catch (error) {
    console.error('Fehler beim Einfrieren der Bonuspunkte:', error);
    throw error;
  }
}

/**
 * Gibt eingefrorene Bonuspunkte für eine Rücksendung frei
 * @param orderId - Die ID der Bestellung
 * @param returnItems - Die Artikel die nicht zurückgegeben wurden
 * @param returnRequestId - Die ID der Rücksendungsanfrage
 */
export async function unfreezeBonusPointsForReturn(
  orderId: string,
  returnItems: IReturnItem[],
  returnRequestId: string
): Promise<void> {
  try {
    const { connectToDatabase } = await import('@/lib/mongodb');
    const User = (await import('@/lib/models/User')).default;
    await connectToDatabase();
    
    // Finde den AdminBonusPoints Timer für diese Bestellung (auch wenn bereits gutgeschrieben)
    const timer = await AdminBonusPoints.findOne({
      orderId: orderId
    });
    
    if (!timer) {
      console.log(`Kein Timer gefunden für Bestellung ${orderId}`);
      return;
    }
    
    let totalUnfrozenPoints = 0;
    
    // Berechne freizugebende Punkte für jeden Artikel
    for (const item of returnItems) {
      const itemBonusPoints = calculateItemBonusPoints(item.price) * item.quantity;
      totalUnfrozenPoints += itemBonusPoints;
    }
    
    if (totalUnfrozenPoints > 0) {
      // Prüfe ob Timer bereits abgelaufen und Punkte gutgeschrieben wurden
      if (timer.bonusPointsCredited) {
        console.log(`Timer für Bestellung ${orderId} bereits abgelaufen. Gebe Punkte direkt an User zurück.`);
        
        // Schreibe die Punkte sofort dem User gut
        const user = await User.findById(timer.userId);
        if (user) {
          user.bonusPoints = (user.bonusPoints || 0) + totalUnfrozenPoints;
          await user.save();
          console.log(`Bonuspunkte direkt an User zurückgegeben: ${totalUnfrozenPoints} Punkte`);
        }
        
        // Aktualisiere die Order - WICHTIG: NICHT bonusPointsEarned erhöhen!
        // Der User bekommt die Punkte direkt, daher sollen sie NICHT nochmal über den Timer gutgeschrieben werden
        const order = await Order.findById(orderId);
        if (order) {
          // Nur dokumentieren, dass Punkte freigegeben wurden
          order.bonusPointsUnfrozen = (order.bonusPointsUnfrozen || 0) + totalUnfrozenPoints;
          order.bonusPointsUnfrozenAt = new Date();
          await order.save();
          console.log(`Order ${order.orderNumber}: ${totalUnfrozenPoints} Punkte als "wieder freigegeben" dokumentiert (NICHT in bonusPointsEarned)`);
        }
      } else {
        // Timer noch nicht abgelaufen - normale Freigabe
        // Entferne Return Request ID aus frozenBy Array
        if (timer.frozenBy) {
          timer.frozenBy = timer.frozenBy.filter(id => id !== returnRequestId);
        }
        
        // Reduziere eingefrorene Punkte
        timer.frozenPoints = Math.max(0, (timer.frozenPoints || 0) - totalUnfrozenPoints);
        
        // WICHTIG: NICHT die Punkte wieder zum Timer hinzufügen!
        // Der Kunde bekommt die Punkte direkt, daher bleiben sie aus dem Timer raus
        // timer.pointsAwarded bleibt unverändert
        
        await timer.save();
        
        // WICHTIG: Order bonusPointsEarned NICHT erhöhen!
        // Der Kunde bekommt die Punkte direkt, daher sollen sie NICHT nochmal über den Timer gutgeschrieben werden
        const order = await Order.findById(orderId);
        if (order) {
          // Nur dokumentieren, dass Punkte freigegeben wurden
          order.bonusPointsUnfrozen = (order.bonusPointsUnfrozen || 0) + totalUnfrozenPoints;
          order.bonusPointsUnfrozenAt = new Date();
          await order.save();
          console.log(`Order ${order.orderNumber}: ${totalUnfrozenPoints} Punkte als "wieder freigegeben" dokumentiert (NICHT in bonusPointsEarned)`);
        }
        
        // Schreibe die Punkte sofort dem User gut
        const user = await User.findById(timer.userId);
        if (user) {
          user.bonusPoints = (user.bonusPoints || 0) + totalUnfrozenPoints;
          await user.save();
          
          console.log(`Bonuspunkte freigegeben und direkt gutgeschrieben: ${totalUnfrozenPoints} Punkte an Benutzer ${timer.userId}`);
          console.log(`Order bonusPointsEarned wurde erhöht, Timer bleibt unverändert`);
        }
      }
    }
  } catch (error) {
    console.error('Fehler beim Freigeben der Bonuspunkte:', error);
    throw error;
  }
}
