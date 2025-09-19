"use client";
import { useEffect, useState } from "react";

type UserProfile = {
  name?: string;
  email?: string;
  isAdmin?: boolean;
  createdAt?: string;
};
type Order = { _id: string };
type Address = { _id: string; street?: string; city?: string };
type ProfileResponse = {
  user: UserProfile;
  orders: Order[];
  addresses: Address[];
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Lade Profil...</div>;
  if (error || !data) return <div className="p-8 text-red-600">Fehler beim Laden des Profils.</div>;

  const { user, orders, addresses } = data;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Mein Profil</h1>
      <div className="mb-6 border rounded p-4 bg-gray-50">
        <div><b>Name:</b> {user.name}</div>
        <div><b>E-Mail:</b> {user.email}</div>
        <div><b>Mitglied seit:</b> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</div>
        {user.isAdmin && <div className="inline-block px-2 py-1 bg-green-200 text-green-900 rounded text-xs font-bold mt-2">Admin</div>}
      </div>
      <h2 className="text-xl font-semibold mt-8 mb-2">Bestellhistorie</h2>
      {orders.length === 0 ? <div>Keine Bestellungen vorhanden.</div> : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li key={order._id} className="border rounded p-2">Bestellung {order._id}</li>
          ))}
        </ul>
      )}
      <h2 className="text-xl font-semibold mt-8 mb-2">Adressen</h2>
      {addresses.length === 0 ? <div>Keine Adressen hinterlegt.</div> : (
        <ul className="space-y-2">
          {addresses.map((addr) => (
            <li key={addr._id} className="border rounded p-2">{addr.street}, {addr.city}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
