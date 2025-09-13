export default function VersandPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <section className="prose max-w-none prose-p:text-gray-550 prose-li:text-gray-700">
            <h1>Unser Versandversprechen</h1>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-md">
              <p className="text-blue-900 font-medium">Wir liefern Ihre 3D-Drucke schnell, sicher und zuverlässig. Hier finden Sie alle Informationen zu unserem Versandservice.</p>
            </div>
            <div className="border-t border-gray-200 my-8"></div>
            <h2>Versanddetails</h2>
            
            <ul className="space-y-2">
            <li><strong>Versandpartner:</strong> Hermes</li>
              <li><strong>Versandkosten:</strong> 4,95 € pro Bestellung</li>
              <li><strong>Versandkostenfreie Lieferung:</strong> Ab einem Bestellwert von 80 €</li>
              <li><strong>Lieferzeit:</strong> 2-5 Werktage</li>
              <li><strong>Versand nach:</strong> Deutschland</li>
            </ul>
            

            <div className="border-t border-gray-200 my-8"></div>
            <h2>Zustellzeit</h2>
            <p>Bitte beachte unser Lieferversprechen beim Bezahlvorgang oder in der Auftragsbestätigung per E-Mail</p>
            

            <div className="border-t border-gray-200 my-8"></div>
            <h2>Wichtige Hinweise</h2>
            <p>Ihre Sendung ist bei uns in sicheren Händen. Alle Pakete sind vollständig versichert, und Sie erhalten Ihre Tracking-Nummer bequem per E-Mail. Die Lieferung erfolgt direkt an die von Ihnen angegebene Adresse. Sollten Sie nicht anzutreffen sein, wird das Paket entweder bei einem Nachbarn oder im nächstgelegenen Hermes-Shop für Sie hinterlegt.</p>

            <div className="border-t border-gray-200 my-8"></div>
            <h2>Fragen zum Versand?</h2>
            <p>Bei Fragen zu Ihrer Bestellung oder dem Versand kontaktieren Sie uns gerne:</p>
            
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
