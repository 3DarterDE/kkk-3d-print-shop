export default function ZahlungsmethodenPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <section className="prose max-w-none prose-p:text-gray-550 prose-li:text-gray-700">
            <h1>Sichere Bezahlung</h1>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-md">
              <p className="text-blue-900 font-medium">Bei 3DarterDE bieten wir Ihnen einfache und sichere Zahlungsmöglichkeiten. Wählen Sie die für Sie passende Methode.</p>
            </div>

            <div className="border-t border-gray-200 my-8"></div>
            <h2>Verfügbare Zahlungsmethoden</h2>
            
            <div className="grid md:grid-cols-2 gap-6 my-8">
              {/* PayPal */}
              <div className="bg-gray-50 p-6 rounded-lg border">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded mr-3 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">P</span>
                  </div>
                  <h3 className="text-lg font-semibold">PayPal</h3>
                </div>
                <ul className="space-y-2">
                  <li>✓ Schnell und sicher bezahlen</li>
                  <li>✓ Käuferschutz inklusive</li>
                  <li>✓ Keine zusätzlichen Gebühren</li>
                  <li>✓ Sofortige Zahlungsbestätigung</li>
                </ul>
              </div>

              {/* Stripe */}
              <div className="bg-gray-50 p-6 rounded-lg border">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-600 rounded mr-3 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <h3 className="text-lg font-semibold">Stripe</h3>
                </div>
                <ul className="space-y-2">
                  <li>✓ Kreditkarten (Visa, Mastercard)</li>
                  <li>✓ Apple Pay & Google Pay</li>
                  <li>✓ SEPA-Lastschrift</li>
                  <li>✓ Sichere Zahlungsabwicklung</li>
                </ul>
              </div>

              {/* Vorkasse */}
              <div className="bg-gray-50 p-6 rounded-lg border">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-600 rounded mr-3 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">V</span>
                  </div>
                  <h3 className="text-lg font-semibold">Vorkasse (Banküberweisung)</h3>
                </div>
                <ul className="space-y-2">
                  <li>✓ Keine zusätzlichen Gebühren</li>
                  <li>✓ 7 Tage Reservierung der Artikel</li>
                  <li>✓ Sichere Zahlungsabwicklung</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-200 my-8"></div>
            <h2>Wie zahle ich per Vorkasse?</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-6 rounded-r-md">
              <p className="text-yellow-900 font-medium">Nach deiner Bestellung erhältst du eine Bestätigungsmail mit allen notwendigen Angaben für die Banküberweisung.</p>
            </div>
            
            <ul className="space-y-2">
              <li>Deine Artikel werden 7 Tage für dich reserviert, bis deine Zahlung eingeht</li>
              <li>Die Bearbeitung deiner Zahlung kann bis zu 5 Werktage dauern</li>
              <li>Jede Bestellung muss separat bezahlt werden</li>
              <li>Rückerstattungen erfolgen auf das ursprüngliche Bankkonto</li>
            </ul>

            <div className="border-t border-gray-200 my-8"></div>
            <h2>Sicherheit</h2>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 my-6 rounded-r-md">
              <p className="text-green-900 font-medium">Ihre Zahlungen sind bei uns sicher. Alle Transaktionen werden verschlüsselt übertragen, sodass Ihre Daten jederzeit geschützt bleiben. Wir speichern keine Zahlungsinformationen und gewährleisten eine sichere Abwicklung für ein sorgenfreies Einkaufserlebnis.</p>
            </div>

            <div className="border-t border-gray-200 my-8"></div>
            <h2>Fragen zur Zahlung?</h2>
            <p>Bei Fragen zu Zahlungen oder Ihrer Bestellung kontaktieren Sie uns gerne:</p>
            
            <ul className="space-y-2">
              <li><strong>E-Mail:</strong> <a href="mailto:service@3darter.de" className="text-blue-600 hover:text-blue-800">service@3darter.de</a></li>
              <li><strong>Kontaktformular:</strong> <a href="/kontakt" className="text-blue-600 hover:text-blue-800">Hier klicken</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
