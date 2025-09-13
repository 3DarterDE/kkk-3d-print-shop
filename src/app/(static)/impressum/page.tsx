import Logo from "@/components/Logo";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <section className="prose max-w-none prose-p:text-gray-550 prose-li:text-gray-700">
            <h1>Impressum</h1>
            
            <div className="grid md:grid-cols-2 gap-8 my-8">
              {/* Links: Firmeninformationen */}
              <div>
                <div className="mb-6">
                  <Logo variant="footer" />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Arslan & Berndt GbR</h3>
                    <p className="text-gray-700">Geschäftsbezeichnung: 3DarterDE<br/>Gesellschafter: Mehmet Emin Arslan / Davin Michel Berndt</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-700">Raduhner Str. 67, 12355 Berlin</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">E-Mail:</h4>
                    <p className="text-gray-700">
                      <a href="mailto:service@3darter.de" className="text-blue-600 hover:text-blue-800">
                        service@3darter.de
                      </a>
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Steuernummer:</h4>
                    <p className="text-gray-700">16/212/07886</p>
                  </div>
                </div>
              </div>

              {/* Rechts: Google Maps */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Standort</h3>
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2427.123456789!2d13.123456!3d52.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sRaduhner%20Str.%2067%2C%2012355%20Berlin!5e0!3m2!1sde!2sde!4v1234567890123!5m2!1sde!2sde"
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Standort 3DarterDE - Raduhner Str. 67, 12355 Berlin"
                  ></iframe>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Raduhner Str. 67, 12355 Berlin
                </p>
              </div>
            </div>

          </section>
        </div>
      </div>
    </div>
  );
}


