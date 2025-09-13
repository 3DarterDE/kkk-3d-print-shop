"use client";

import { useState } from "react";

export default function KontaktPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    privacy: false
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validierung
    if (!formData.name.trim()) newErrors.name = "Name ist erforderlich";
    if (!formData.email.trim()) newErrors.email = "E-Mail ist erforderlich";
    if (!formData.subject.trim()) newErrors.subject = "Betreff ist erforderlich";
    if (!formData.message.trim()) newErrors.message = "Nachricht ist erforderlich";
    if (!formData.privacy) newErrors.privacy = "Sie müssen der Datenschutzerklärung zustimmen";

    // E-Mail Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Bitte geben Sie eine gültige E-Mail-Adresse ein";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Hier würde normalerweise die Formular-Übermittlung stattfinden
      alert("Formular erfolgreich übermittelt!");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        privacy: false
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <section className="prose max-w-none prose-p:text-gray-550 prose-li:text-gray-700">
            <h1>Kontakt</h1>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-md">
              <p className="text-blue-900 font-medium">Haben Sie Fragen zu Autodarts oder unserem 3D-Druckservice? Wir helfen Ihnen gerne weiter!</p>
            </div>

            <div className="max-w-2xl mx-auto">
              <h2>Nachricht senden</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ihr vollständiger Name"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      E-Mail *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="ihre.email@beispiel.de"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Betreff *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.subject ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Betreff Ihrer Nachricht"
                    />
                    {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Nachricht *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.message ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ihre Nachricht an uns..."
                    />
                    {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
                  </div>

                  <div>
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="privacy"
                        checked={formData.privacy}
                        onChange={handleChange}
                        className={`mt-1 mr-3 ${errors.privacy ? 'border-red-500' : ''}`}
                      />
                      <span className="text-sm text-gray-700">
                        Ich stimme der <a href="/datenschutz" className="text-blue-600 hover:text-blue-800">Datenschutzerklärung</a> zu und erlaube die Verarbeitung meiner Daten zur Bearbeitung meiner Anfrage. *
                      </span>
                    </label>
                    {errors.privacy && <p className="text-red-500 text-sm mt-1">{errors.privacy}</p>}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    Nachricht senden
                  </button>
                </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


