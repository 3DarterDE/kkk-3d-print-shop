export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <section className="prose max-w-none prose-p:text-gray-550 prose-li:text-gray-700">
            <h1>Häufig gestellte Fragen (FAQ)</h1>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-md">
              <p className="text-blue-900 font-medium">Hier finden Sie Antworten auf die häufigsten Fragen zu Autodarts und unserem 3D-Druckservice. Falls Sie weitere Fragen haben, kontaktieren Sie uns gerne!</p>
            </div>

            <div className="border-t border-gray-200 my-8"></div>
            <h2>Autodarts</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Was ist Autodarts?</h3>
                <p>Autodarts ist ein innovatives System, das mithilfe von Kameras automatisch die Würfe auf einer Dartscheibe erkennt. Das System ermöglicht es Ihnen, online gegen andere Spieler anzutreten oder Ihr Training zu analysieren.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Welche Komponenten benötige ich für ein Autodarts-System?</h3>
                <p>Für ein funktionierendes Autodarts-System benötigen Sie:</p>
                <ul className="mt-2">
                  <li>Verschiedene 3D-gedruckte Halterungen und Komponenten</li>
                  <li>3x Kameras (z.B. von HBV oder GXVision)</li>
                  <li>Eine stabile Beleuchtung</li>
                  <li>Einen Computer / Raspberry Pi / Laptop</li>
                  <li>Eine Dartscheibe</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Welche Dartscheibe ist für Autodarts geeignet?</h3>
                <p>Grundsätzlich können Sie jede Bristle-Dartscheibe verwenden. Besonders bewährt haben sich Scheiben von Winmau, Unicorn oder Target. Die Scheibe sollte eine gute Qualität aufweisen, da dies die Erkennung der Würfe verbessert.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Wie funktioniert die Wurferkennung?</h3>
                <p>Die installierten Kameras nehmen die Dartscheibe aus verschiedenen Winkeln auf. Mithilfe der Software von Autodarts und Bildverarbeitung wird der genaue Trefferpunkt des Dartpfeils erkannt und in das Spiel übertragen.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Welche Beleuchtung wird empfohlen?</h3>
                <p>Eine gleichmäßige, helle Beleuchtung ist entscheidend für die zuverlässige Wurferkennung. Wir empfehlen LED-Streifen oder spezielle Dartboard-Beleuchtungen. Die Beleuchtung sollte schattenfrei sein und die gesamte Scheibe gleichmäßig ausleuchten.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Kann ich Autodarts auch in einem hellen Raum nutzen?</h3>
                <p>Ja, aber die Beleuchtungsbedingungen sollten möglichst konstant sein. Direkte Sonneneinstrahlung oder stark wechselndes Umgebungslicht können die Erkennung beeinträchtigen.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Wie genau ist die Wurferkennung?</h3>
                <p>Bei korrekter Installation und Kalibrierung ist die Wurferkennung sehr präzise. Die Treffergenauigkeit liegt bei über 99%. Wichtig sind eine stabile Montage der Kameras, gute Beleuchtung und regelmäßige Kalibrierung des Systems.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Welche Online-Features bietet Autodarts?</h3>
                <p>Mit Autodarts können Sie:</p>
                <ul className="mt-2">
                  <li>Online gegen andere Spieler antreten</li>
                  <li>Lokal mit bis zu 5 weiteren Spielern spielen</li>
                  <li>An Turnieren teilnehmen</li>
                  <li>Ihr Training analysieren</li>
                  <li>Verschiedene Spielmodi nutzen</li>
                  <li>Statistiken und Fortschritte verfolgen</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Wo bekomme ich Unterstützung bei der Installation?</h3>
                <p>Wir bieten ausführliche Anleitungen und Support bei der Installation Ihres Autodarts-Systems. Bei Fragen können Sie uns jederzeit kontaktieren. Zusätzlich gibt es eine aktive Discord-Community, die bei Problemen weiterhilft.</p>
              </div>
            </div>

            <div className="border-t border-gray-200 my-8"></div>
            <h2>3D-Druckservice</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Was ist ein 3D-Druckservice?</h3>
                <p>Ein 3D-Druckservice ermöglicht es Ihnen, digitale 3D-Modelle in physische Objekte umzuwandeln. Für individuelle Druckaufträge setzen Sie sich bitte direkt mit uns in Verbindung. Wir beraten Sie gerne zu Ihrem Projekt und erstellen Ihnen ein unverbindliches Angebot.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Wie bestelle ich einen 3D-Druck?</h3>
                <p>Setzen Sie sich einfach über unser Kontaktformular oder per E-Mail mit uns in Verbindung. Beschreiben Sie uns Ihr gewünschtes Objekt, und wir erstellen Ihnen ein unverbindliches Angebot. Gerne beraten wir Sie auch zu Materialien, Farben und technischen Möglichkeiten.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Welche Dateiformate können Sie verarbeiten?</h3>
                <p>Wir können verschiedene 3D-Formate verarbeiten, hauptsächlich STL, OBJ und 3MF. Falls Sie andere Formate haben, kontaktieren Sie uns gerne - wir finden eine Lösung.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Darf ich jedes Modell drucken lassen?</h3>
                <p>Sie müssen sicherstellen, dass Sie die Rechte an den 3D-Dateien besitzen oder dass sie unter einer Lizenz stehen, die das Drucken erlaubt. Wir prüfen jeden Auftrag individuell und beraten Sie gerne zu rechtlichen Aspekten.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Welche Materialien und Farben stehen zur Verfügung?</h3>
                <p>Wir bieten verschiedene Materialien und Farben für Ihre 3D-Drucke. Kontaktieren Sie uns gerne, um die verfügbaren Optionen für Ihr spezifisches Projekt zu besprechen. Wir beraten Sie auch zu den besten Materialeigenschaften für Ihren Anwendungsfall.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Wie lange dauert die Bearbeitung und der Versand?</h3>
                <p>Je nach Komplexität und aktueller Auslastung dauert die Bearbeitung 2-5 Werktage. Der Versand erfolgt anschließend innerhalb von 1-3 Werktagen. Wir informieren Sie gerne über den aktuellen Bearbeitungsstand.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Wie erfolgt die Bezahlung?</h3>
                <p>Nach der Auftragsbestätigung können Sie mit PayPal, Kreditkarte oder per Vorkasse (Überweisung) bezahlen. Wir senden Ihnen die Zahlungsinformationen zusammen mit dem Angebot zu.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Kann ich ein Ersatzteil nachbestellen?</h3>
                <p>Sie können bei uns ebenfalls Ersatzteile nachbestellen. Nutzen Sie hierfür gerne unser Kontaktformular unter genauer Beschreibung des benötigten Ersatzteils. Wir antworten Ihnen umgehend.</p>
              </div>
            </div>

            <div className="border-t border-gray-200 my-8"></div>
            <h2>Kontakt</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-md">
              <p className="text-blue-900 font-medium">An wen kann ich mich bei weiteren Fragen wenden?</p>
              <p className="text-blue-900 font-medium">Sie können uns jederzeit per E-Mail oder über das Kontaktformular auf unserer Webseite erreichen.</p>
            </div>
            
            <div className="bg-gray-100 p-6 rounded-lg my-6">
              <p><strong>E-Mail:</strong> <a href="mailto:service@3darter.de" className="text-blue-600 hover:text-blue-800">service@3darter.de</a></p>
              <p><strong>Kontaktformular:</strong> <a href="/kontakt" className="text-blue-600 hover:text-blue-800">Hier klicken</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
