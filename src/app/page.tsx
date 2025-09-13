import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import ScrollAnimation from "@/components/ScrollAnimation";

export default function Home() {
  return (
    <>
      {/* Hero Section mit Header-Bild */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Hintergrund-Bild */}
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/images/hero/background.webp')`
            }}
          ></div>
          {/* Animierter Overlay für bessere Lesbarkeit */}
          <div className="absolute inset-0 bg-black/70 animate-fade-to-light"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-20 text-center text-white max-w-4xl mx-auto px-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up hover:scale-105 transition-transform duration-300">
            3D-Druck & Autodarts
            <span className="block text-blue-200">Spezialist</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto animate-fade-in-up delay-200 hover:scale-105 transition-transform duration-300">
            Professioneller 3D-Druckservice und Autodarts Konfiguration mit modernster Technologie
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-400">
            <Link href="/shop" className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:scale-105 transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl">
              Zum Shop
            </Link>
            <Link href="/kontakt" className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-900 hover:scale-105 transition-all duration-300 text-lg font-semibold">
              Kontakt
            </Link>
          </div>
        </div>
      </section>

      {/* Hauptinhalt */}
      <section className="max-w-7xl mx-auto px-6 py-2">
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fade-in-up">
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8 text-center">
              <h3 className="font-semibold text-gray-900 text-xl mb-3">Express 3D-Druck</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Schnelle und präzise Fertigung Ihrer 3D-Modelle mit modernster Technologie
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '200ms'}}>
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8 text-center">
              <h3 className="font-semibold text-gray-900 text-xl mb-3">Individuelle Beratung</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Persönliche Unterstützung bei der Materialwahl und Optimierung Ihrer 3D-Drucke
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '400ms'}}>
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8 text-center">
              <h3 className="font-semibold text-gray-900 text-xl mb-3">Autodarts Expertise</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Professionelle Beratung und Support bei der Konfiguration Ihres Autodarts Systems
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: '600ms'}}>
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8 text-center">
              <h3 className="font-semibold text-gray-900 text-xl mb-3">Qualitätsprodukte</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Sorgfältig ausgewählte Komponenten für Ihr optimales Autodarts Erlebnis
              </p>
            </div>
          </div>
        </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScrollAnimation delay={0}>
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">3D-Druckservice</h3>
              <p className="text-gray-600 mb-6">
                Professioneller 3D-Druck für Ihre individuellen Projekte. Express-Fertigung und höchste Qualität garantiert. 

              </p>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Express-Service verfügbar
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Verschiedene Materialien
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Kostenlose Beratung
                </li>
              </ul>
              <Link href="/kontakt" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Kontakt für 3D-Druck
              </Link>
            </div>
          </div>
        </ScrollAnimation>

        <ScrollAnimation delay={0}>
          <div className="bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
            <div className="p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Autodarts Konfiguration</h3>
              <p className="text-gray-600 mb-6">
                Professionelle Autodarts Systeme und Zubehör. Individuelle Konfiguration nach Ihren Wünschen.
              </p>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Komplette Systeme
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Professionelle Beratung
            </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Qualitätskomponenten
            </li>
              </ul>
              <Link href="/shop" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Zur Autodarts Konfiguration
              </Link>
            </div>
          </div>
        </ScrollAnimation>
      </div>

      <ScrollAnimation delay={0}>
        <div className="mt-16 bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
          <div className="p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Neu im Blog</h3>
            <p className="text-lg font-medium text-gray-800 mb-2">
              Autodarts: Die Revolution des digitalen Dartsports
            </p>
            <p className="text-gray-600 mb-4">
              Entdecke die Zukunft des Dartsports! Automatische Punktezählung, Online-Wettkämpfe und präzise Spielauswertung
              - erfahre alles über die innovative Technologie, die den Dartsport revolutioniert.
            </p>
            <Link href="/blog" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors">
              Zum Blogbeitrag 
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </ScrollAnimation>

      <ScrollAnimation delay={0}>
        <div className="mt-16 bg-white rounded-lg border border-blue-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="h-1 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300"></div>
          <div className="p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Das sagen unsere Kunden</h3>
            <blockquote className="text-lg text-gray-700 italic">
              „Super schneller Service und top Qualität. Die 3D-Druckteile sind genau wie bestellt und die Autodarts-Beratung war erstklassig!"
            </blockquote>
            <p className="text-sm text-gray-500 mt-2">- Max Mustermann, zufriedener Kunde</p>
          </div>
        </div>
      </ScrollAnimation>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "3D-Druckteile",
          url: (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000")) + "/",
        }}
      />
    </>
  );
}