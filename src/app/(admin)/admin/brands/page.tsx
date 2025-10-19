"use client";

import React, { useEffect, useState } from "react";
import MarkdownEditor from "@/components/MarkdownEditor";

interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  image?: string;
  imageSizes?: { main: string; thumb: string; small: string };
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Markdown Editor state
  const [descriptionContent, setDescriptionContent] = useState('');

  useEffect(() => {
    fetchBrands();
  }, []);


  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/brands");
      const data = await res.json();
      setBrands(Array.isArray(data) ? data : []);
    } catch {
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  const submitBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    
    // Get description from markdown state
    const description = descriptionContent || "";
    
    const payload = {
      name: fd.get("name") as string,
      description: description,
      isActive: fd.get("isActive") === "on",
      sortOrder: editing ? editing.sortOrder : brands.length,
    };
    let res: Response;
    if (editing) {
      res = await fetch(`/api/admin/brands/${editing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      alert("Fehler beim Speichern der Marke");
      return;
    }
    const saved = await res.json();
    if (imageFile) {
      const imgFD = new FormData();
      imgFD.append("image", imageFile);
      imgFD.append("brandId", saved._id);
      const csrf = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))?.split('=')[1] || '';
      await fetch("/api/admin/brands/upload-image", { method: "POST", headers: { 'x-csrf-token': csrf }, body: imgFD });
    }
    setShowForm(false);
    setEditing(null);
    setImageFile(null);
    setImagePreview(null);
    fetchBrands();
  };

  const deleteBrand = async (id: string) => {
    if (!confirm("Diese Marke wirklich löschen?")) return;
    const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Löschen fehlgeschlagen");
      return;
    }
    fetchBrands();
  };

  const moveBrand = async (from: number, to: number) => {
    const arr = [...brands];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setBrands(arr);
    try {
      const brandIds = arr.map(b => b._id);
      await fetch("/api/admin/brands/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandIds })
      });
    } finally {
      fetchBrands();
    }
  };

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Markenverwaltung</h1>
            <p className="mt-2 text-gray-600">Marken anlegen, bearbeiten, sortieren</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Neue Marke
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beschreibung</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bild</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {brands.map((brand, index) => (
                <tr key={brand._id}
                  className={`hover:bg-gray-50 ${dragIndex === index ? 'opacity-50' : ''}`}
                  draggable
                  onDragStart={(e) => { setDragIndex(index); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== index) moveBrand(dragIndex, index); setDragIndex(null); }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <div className="mr-2 cursor-move text-gray-400">⋮⋮</div>
                      <span className="font-semibold">{brand.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{brand.slug}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{brand.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {brand.image && (
                      <img src={brand.imageSizes?.thumb || brand.image} alt={brand.name} className="h-10 w-10 object-contain" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={async () => {
                        await fetch(`/api/admin/brands/${brand._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !brand.isActive }) });
                        fetchBrands();
                      }}
                      className={`px-2 py-1 text-xs rounded-full ${brand.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {brand.isActive ? 'Aktiv' : 'Inaktiv'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => { 
                      setEditing(brand); 
                      setDescriptionContent(brand.description || '');
                      setShowForm(true); 
                    }} className="text-blue-600 hover:text-blue-900 mr-3">Bearbeiten</button>
                    <button onClick={() => deleteBrand(brand._id)} className="text-red-600 hover:text-red-900">Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <form onSubmit={submitBrand} className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{editing ? 'Marke bearbeiten' : 'Neue Marke'}</h2>
                    <button type="button" onClick={() => { setShowForm(false); setEditing(null); setImageFile(null); setImagePreview(null); }} className="text-gray-400 hover:text-gray-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input name="name" type="text" required defaultValue={editing?.name || ''} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <MarkdownEditor
                      value={descriptionContent}
                      onChange={setDescriptionContent}
                      placeholder="Markdown-Beschreibung für die Marke eingeben..."
                      height={300}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Markenbild</label>
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] || null; setImageFile(f); if (f) { const r = new FileReader(); r.onload = ev => setImagePreview(ev.target?.result as string); r.readAsDataURL(f); } }} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                      {imagePreview ? (
                        <div className="mt-2">
                          <img src={imagePreview} alt="Preview" className="h-20 w-20 object-contain" />
                        </div>
                      ) : editing?.image ? (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={editing.imageSizes?.thumb || editing.image} alt="Current" className="h-20 w-20 object-contain" />
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Bild wirklich löschen?')) {
                                try {
                              const csrf = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))?.split('=')[1] || '';
                              await fetch(`/api/admin/brands/${editing._id}/delete-image`, { method: 'DELETE', headers: { 'x-csrf-token': csrf } });
                                  fetchBrands();
                                  setEditing({ ...editing, image: undefined, imageSizes: undefined });
                                } catch (error) {
                                  alert('Fehler beim Löschen des Bildes');
                                }
                              }
                            }}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Bild löschen
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center">
                      <input name="isActive" type="checkbox" defaultChecked={editing?.isActive !== false} className="mr-2" />
                      <label className="text-sm text-gray-700">Aktiv</label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                    <button type="button" onClick={() => { setShowForm(false); setEditing(null); setImageFile(null); setImagePreview(null); }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Abbrechen</button>
                    <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">{editing ? 'Aktualisieren' : 'Erstellen'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


