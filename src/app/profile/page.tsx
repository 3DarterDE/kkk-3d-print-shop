"use client";
import { useEffect, useState } from "react";
import { useAuth } from '@/lib/hooks/useAuth';
import Link from "next/link";
import { useUserData } from "@/lib/contexts/UserDataContext";
import { IUser } from "@/lib/models/User";
import { withCursorPointer } from '@/lib/cursor-utils';

type UserProfile = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  salutation?: 'Herr' | 'Frau' | 'Divers';
  address?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    street?: string;
    houseNumber?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  billingAddress?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    street?: string;
    houseNumber?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  useSameAddress?: boolean;
  paymentMethod?: 'card' | 'paypal' | 'bank';
  isAdmin?: boolean;
  isVerified?: boolean;
  bonusPoints?: number;
  newsletterSubscribed?: boolean;
  createdAt?: string;
};

type Order = { 
  _id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'return_requested' | 'return_completed';
  total: number;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    variations?: Record<string, string>;
  }[];
  shippingAddress: {
    street: string;
    houseNumber: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
};
type Address = { _id: string; street?: string; city?: string };
type ProfileResponse = {
  user: UserProfile;
  orders: Order[];
  addresses: Address[];
};

export default function ProfilePage() {
  const { user, orders, loading, error, refetchUser } = useUserData();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<'contact' | 'billing' | 'shipping' | 'payment' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [useSameAddress, setUseSameAddress] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [bonusSchedule, setBonusSchedule] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    salutation: '',
    firstName: '',
    lastName: '',
    address: {
      firstName: '',
      lastName: '',
      company: '',
      street: '',
      houseNumber: '',
      addressLine2: '',
      city: '',
      postalCode: '',
      country: 'Deutschland'
    },
    billingAddress: {
      firstName: '',
      lastName: '',
      company: '',
      street: '',
      houseNumber: '',
      addressLine2: '',
      city: '',
      postalCode: '',
      country: 'Deutschland'
    },
    paymentMethod: 'card' as 'card' | 'paypal' | 'bank'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        salutation: user.salutation || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        address: {
          firstName: user.address?.firstName || user.firstName || '',
          lastName: user.address?.lastName || user.lastName || '',
          company: user.address?.company || '',
          street: user.address?.street || '',
          houseNumber: user.address?.houseNumber || '',
          addressLine2: user.address?.addressLine2 || '',
          city: user.address?.city || '',
          postalCode: user.address?.postalCode || '',
          country: user.address?.country || 'Deutschland'
        },
        billingAddress: {
          firstName: user.billingAddress?.firstName || user.address?.firstName || user.firstName || '',
          lastName: user.billingAddress?.lastName || user.address?.lastName || user.lastName || '',
          company: user.billingAddress?.company || '',
          street: user.billingAddress?.street || '',
          houseNumber: user.billingAddress?.houseNumber || '',
          addressLine2: user.billingAddress?.addressLine2 || '',
          city: user.billingAddress?.city || '',
          postalCode: user.billingAddress?.postalCode || '',
          country: user.billingAddress?.country || 'Deutschland'
        },
        paymentMethod: user.paymentMethod || 'card'
      });
      
      // Use the user's useSameAddress preference or check if addresses are the same
      if (user.useSameAddress !== undefined) {
        setUseSameAddress(user.useSameAddress);
      } else if (user.address && user.billingAddress) {
        const addressesMatch = JSON.stringify(user.address) === JSON.stringify(user.billingAddress);
        setUseSameAddress(addressesMatch);
      }
    }
  }, [user]);

  // Load bonus schedule (orders + reviews) for display
  useEffect(() => {
    const loadBonusSchedule = async () => {
      try {
        const entries: any[] = [];

        // Map orders: planned/credited points from orders
        (orders || []).forEach((o: any) => {
          const orderNumber = o.orderNumber;
          const points = o.bonusPointsEarned || 0;
          if (points > 0) {
            if (o.bonusPointsScheduledAt && !o.bonusPointsCredited) {
              entries.push({
                kind: 'order',
                orderId: o._id,
                orderNumber,
                points,
                scheduledAt: o.bonusPointsScheduledAt,
                credited: false,
              });
            }
            if (o.bonusPointsCredited && o.bonusPointsCreditedAt) {
              entries.push({
                kind: 'order',
                orderId: o._id,
                orderNumber,
                points,
                credited: true,
                creditedAt: o.bonusPointsCreditedAt,
              });
            }
          }
        });

        // Map reviews: planned/credited points from reviews per order
        if (orders && orders.length > 0) {
          const orderIds = orders.map((o: any) => o._id);
          const res = await fetch(`/api/reviews?orderId=${orderIds.join(',')}`);
          if (res.ok) {
            const data = await res.json();
            const reviews: any[] = data.reviews || [];
            // Create a map for orderId -> orderNumber
            const idToNumber: Record<string, string> = {};
            for (const o of orders as any[]) {
              idToNumber[o._id] = o.orderNumber;
            }
            reviews.forEach((r) => {
              const points = r.bonusPointsAwarded || 0;
              if (points <= 0) return;
              const orderNumber = idToNumber[r.orderId] || r.orderId;
              if (r.bonusPointsScheduledAt && !r.bonusPointsCredited) {
                entries.push({
                  kind: 'review',
                  orderId: r.orderId,
                  reviewId: r._id,
                  orderNumber,
                  points,
                  scheduledAt: r.bonusPointsScheduledAt,
                  credited: false,
                });
              }
              if (r.bonusPointsCredited && r.bonusPointsCreditedAt) {
                entries.push({
                  kind: 'review',
                  orderId: r.orderId,
                  reviewId: r._id,
                  orderNumber,
                  points,
                  credited: true,
                  creditedAt: r.bonusPointsCreditedAt,
                });
              }
            });
          }
        }

        // Sort: upcoming first by scheduled date, then credited by creditedAt desc
        const upcoming = entries
          .filter(e => !e.credited && e.scheduledAt)
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        const credited = entries
          .filter(e => e.credited && e.creditedAt)
          .sort((a, b) => new Date(b.creditedAt).getTime() - new Date(a.creditedAt).getTime());

        setBonusSchedule([...upcoming, ...credited]);
      } catch (e) {
        // Silent fail for schedule widget
        setBonusSchedule([]);
      }
    };

    if (orders) {
      loadBonusSchedule();
    }
  }, [orders]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          text: 'Ausstehend',
          color: 'text-amber-600',
          bg: 'bg-amber-100'
        };
      case 'processing':
        return {
          text: 'In Bearbeitung',
          color: 'text-blue-600',
          bg: 'bg-blue-100'
        };
      case 'shipped':
        return {
          text: 'Versandt',
          color: 'text-purple-600',
          bg: 'bg-purple-100'
        };
      case 'delivered':
        return {
          text: 'Geliefert',
          color: 'text-green-600',
          bg: 'bg-green-100'
        };
      case 'cancelled':
        return {
          text: 'Storniert',
          color: 'text-red-600',
          bg: 'bg-red-100'
        };
      case 'return_requested':
        return {
          text: 'Rücksendung angefordert',
          color: 'text-amber-700',
          bg: 'bg-amber-100'
        };
      case 'return_completed':
        return {
          text: 'Rücksendung\nabgeschlossen',
          color: 'text-purple-700',
          bg: 'bg-purple-100'
        };
      default:
        return {
          text: status,
          color: 'text-gray-600',
          bg: 'bg-gray-100'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const updateData = {
        salutation: formData.salutation,
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address,
        billingAddress: useSameAddress ? formData.address : formData.billingAddress,
        useSameAddress: useSameAddress,
        paymentMethod: formData.paymentMethod
      };

      const csrf = document.cookie.split('; ').find((c) => c.startsWith('csrf_token='))?.split('=')[1] || '';
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf,
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Profil erfolgreich aktualisiert!' });
        setIsEditing(false);
        await refetchUser(); // Reload data
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Fehler beim Speichern' });
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Fehler beim Speichern des Profils' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveMessage(null);
    // Reset form to original data
    if (user) {
      setFormData({
        salutation: user.salutation || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        address: {
          firstName: user.address?.firstName || user.firstName || '',
          lastName: user.address?.lastName || user.lastName || '',
          company: user.address?.company || '',
          street: user.address?.street || '',
          houseNumber: user.address?.houseNumber || '',
          addressLine2: user.address?.addressLine2 || '',
          city: user.address?.city || '',
          postalCode: user.address?.postalCode || '',
          country: user.address?.country || 'Deutschland'
        },
        billingAddress: {
          firstName: user.billingAddress?.firstName || user.address?.firstName || user.firstName || '',
          lastName: user.billingAddress?.lastName || user.address?.lastName || user.lastName || '',
          company: user.billingAddress?.company || '',
          street: user.billingAddress?.street || '',
          houseNumber: user.billingAddress?.houseNumber || '',
          addressLine2: user.billingAddress?.addressLine2 || '',
          city: user.billingAddress?.city || '',
          postalCode: user.billingAddress?.postalCode || '',
          country: user.billingAddress?.country || 'Deutschland'
        },
        paymentMethod: user.paymentMethod || 'card'
      });
    }
  };

  const handleNewsletterToggle = async () => {
    if (!user) return;
    
    setNewsletterLoading(true);
    
    try {
      const action = user.newsletterSubscribed ? 'unsubscribe' : 'subscribe';
      const response = await fetch('/api/newsletter/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Ändern der Newsletter-Einstellung');
      }

      // Refresh user data to get updated newsletter status
      await refetchUser();
      
      setSaveMessage({
        type: 'success',
        text: user.newsletterSubscribed 
          ? 'Sie haben sich erfolgreich vom Newsletter abgemeldet.'
          : 'Sie haben sich erfolgreich für den Newsletter angemeldet.'
      });
    } catch (error) {
      console.error('Newsletter toggle error:', error);
      setSaveMessage({
        type: 'error',
        text: 'Fehler beim Ändern der Newsletter-Einstellung. Bitte versuchen Sie es erneut.'
      });
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    
    try {
      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Clear local session and redirect to home page
        // Don't use Auth0 logout since user is already deleted
        try {
          // Clear any local storage/session data
          localStorage.clear();
          sessionStorage.clear();
          
          // Clear Auth0 session cookies manually
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
          
        } catch (e) {
          // Ignore errors if storage is not available
        }
        
        // Force a hard reload to clear all cached auth state
        // Don't use Auth0 logout since user is already deleted
        window.location.replace('/');
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Fehler beim Löschen des Accounts' });
        setShowDeleteModal(false);
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Fehler beim Löschen des Accounts' });
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if ((authLoading || loading) && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Sidebar skeleton */}
            <div className="w-full lg:w-72 mt-4 lg:mt-8 self-start bg-white/80 backdrop-blur-sm shadow-lg border border-white/20 rounded-2xl p-6 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-9 bg-gray-100 rounded"></div>
                <div className="h-9 bg-gray-100 rounded"></div>
                <div className="h-9 bg-gray-100 rounded"></div>
              </div>
            </div>

            {/* Main content skeleton */}
            <div className="flex-1 py-4 lg:py-8 animate-pulse">
              <div className="mb-6 lg:mb-10">
                <div className="rounded-2xl p-8 bg-gray-100 h-28"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="bg-white/70 border border-white/30 rounded-2xl p-6 h-48"></div>
                <div className="bg-white/70 border border-white/30 rounded-2xl p-6 h-48"></div>
                <div className="bg-white/70 border border-white/30 rounded-2xl p-6 h-48"></div>
                <div className="bg-white/70 border border-white/30 rounded-2xl p-6 h-48"></div>
              </div>

              <div className="mt-8 bg-white/70 border border-white/30 rounded-2xl p-6 h-56"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-amber-500 text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Anmeldung erforderlich</h2>
          <p className="text-gray-600 mb-4">Bitte melde dich an, um dein Profil zu sehen.</p>
          <a
            href="/api/auth/login"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Jetzt anmelden
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Fehler beim Laden</h2>
          <p className="text-gray-600 mb-4">Das Profil konnte nicht geladen werden.</p>
          <button 
            onClick={refetchUser}
            className={withCursorPointer("bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors")}
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Fallback skeleton if noch kein Nutzerobjekt vorliegt, aber auch kein Fehler
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 py-8">
          <div className="animate-pulse h-32 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-72 mt-4 lg:mt-8 self-start bg-white/80 backdrop-blur-sm shadow-lg border border-white/20 rounded-2xl">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Mein Konto</h2>
                <div className="w-12 h-1 bg-gradient-to-r from-blue-800 to-blue-500 rounded-full"></div>
              </div>
              <nav className="space-y-2">
                <a href="#" className="flex items-center px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-800 to-blue-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Benutzerkonto Übersicht
                </a>
                <Link href="/orders" prefetch className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                  <div className="w-2 h-2 bg-slate-300 rounded-full mr-3 group-hover:bg-blue-500 transition-colors"></div>
                  Meine Bestellungen
                </Link>
                <Link href="/bonus" prefetch className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                  <div className="w-2 h-2 bg-slate-300 rounded-full mr-3 group-hover:bg-blue-500 transition-colors"></div>
                  Bonuspunkte
                </Link>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 py-4 lg:py-8">
          {/* Header */}
          <div className="mb-6 lg:mb-10">
            <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 lg:mb-3">
                Willkommen zurück, {user.firstName}!
              </h1>
              <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
                Verwalte deine Kontoinformationen und behalte den Überblick über deine Bestellungen.
              </p>
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`mb-6 p-4 rounded-xl shadow-md ${
              saveMessage.type === 'success' 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${saveMessage.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                {saveMessage.text}
              </div>
            </div>
          )}

          {/* Account Information Cards */}
          <div className="mb-6 lg:mb-10">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div className="flex items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Kontoinformationen</h2>
                <div className="ml-2 sm:ml-4 w-8 sm:w-16 h-1 bg-gradient-to-r from-blue-800 to-blue-500 rounded-full"></div>
              </div>
              <button
                onClick={() => setShowAccountSettingsModal(true)}
                className={withCursorPointer("px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors")}
              >
                Kontoeinstellungen
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Contact Data Card */}
              <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-4 sm:p-6 relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                <button
                  onClick={() => {
                    setEditingSection('contact');
                    setIsEditing(true);
                  }}
                  className={withCursorPointer("absolute top-2 right-2 sm:top-4 sm:right-4 text-blue-600 text-xs sm:text-sm font-medium hover:text-blue-700 bg-blue-50 px-2 sm:px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors")}
                >
                  Bearbeiten
                </button>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-800 to-blue-600 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Kontaktdaten</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                    <p className="text-slate-700 font-medium truncate" title={`${user.firstName} ${user.lastName}`}>{user.firstName} {user.lastName}</p>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
                    <p className="text-slate-700 truncate" title={user.email}>{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Newsletter Card */}
              <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-4 sm:p-6 relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-300 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Newsletter</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${user.newsletterSubscribed ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <p className="text-slate-700">
                        {user.newsletterSubscribed ? 'Angemeldet' : 'Nicht angemeldet'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleNewsletterToggle()}
                      disabled={newsletterLoading}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                        user.newsletterSubscribed
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-green-600 bg-green-50 hover:bg-green-100'
                      } ${newsletterLoading ? 'disabled:opacity-50 disabled:cursor-not-allowed' : withCursorPointer('')}`}
                    >
                      {newsletterLoading ? 'Wird verarbeitet...' : user.newsletterSubscribed ? 'Abmelden' : 'Anmelden'}
                    </button>
                  </div>
                  <p className="text-sm text-slate-500">
                    {user.newsletterSubscribed 
                      ? 'Sie erhalten regelmäßig Informationen über neue Produkte und Rabatte.'
                      : 'Melden Sie sich für unseren Newsletter an und verpassen Sie keine Angebote.'
                    }
                  </p>
                </div>
              </div>

              {/* Shipping Address Card */}
              <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-4 sm:p-6 relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                <button
                  onClick={() => {
                    setEditingSection('shipping');
                    setIsEditing(true);
                  }}
                  className={withCursorPointer("absolute top-2 right-2 sm:top-4 sm:right-4 text-blue-600 text-xs sm:text-sm font-medium hover:text-blue-700 bg-blue-50 px-2 sm:px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors")}
                >
                  Bearbeiten
                </button>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-300 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Versandadresse</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-700 font-medium truncate" title={`${user.address?.firstName || user.firstName} ${user.address?.lastName || user.lastName}`}>
                    {user.address?.firstName || user.firstName} {user.address?.lastName || user.lastName}
                  </p>
                  <p className="text-slate-600 truncate" title={`${user.address?.street} ${user.address?.houseNumber}${user.address?.addressLine2 ? `, ${user.address.addressLine2}` : ''}`}>
                    {user.address?.street} {user.address?.houseNumber}
                    {user.address?.addressLine2 && `, ${user.address.addressLine2}`}
                  </p>
                  <p className="text-slate-600 truncate" title={`${user.address?.postalCode} ${user.address?.city}`}>
                    {user.address?.postalCode} {user.address?.city}
                  </p>
                  <p className="text-slate-600 truncate" title={user.address?.country || 'Deutschland'}>{user.address?.country || 'Deutschland'}</p>
                </div>
              </div>

              {/* Billing Address Card */}
              <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-4 sm:p-6 relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                <button
                  onClick={() => {
                    setEditingSection('billing');
                    setIsEditing(true);
                  }}
                  className={withCursorPointer("absolute top-2 right-2 sm:top-4 sm:right-4 text-blue-600 text-xs sm:text-sm font-medium hover:text-blue-700 bg-blue-50 px-2 sm:px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors")}
                >
                  Bearbeiten
                </button>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Rechnungsadresse</h3>
                </div>
                <div className="space-y-2">
                  {useSameAddress ? (
                    <>
                      <p className="text-blue-600 font-medium mb-2">✓ Identisch mit Versandadresse</p>
                      <div className="text-slate-500 italic">
                        <p className="text-slate-700 font-medium truncate" title={`${user.address?.firstName || user.firstName} ${user.address?.lastName || user.lastName}`}>
                          {user.address?.firstName || user.firstName} {user.address?.lastName || user.lastName}
                        </p>
                        <p className="truncate" title={`${user.address?.street} ${user.address?.houseNumber}${user.address?.addressLine2 ? `, ${user.address.addressLine2}` : ''}`}>
                          {user.address?.street} {user.address?.houseNumber}
                          {user.address?.addressLine2 && `, ${user.address.addressLine2}`}
                        </p>
                        <p className="truncate" title={`${user.address?.postalCode} ${user.address?.city}`}>
                          {user.address?.postalCode} {user.address?.city}
                        </p>
                        <p className="truncate" title={user.address?.country || 'Deutschland'}>{user.address?.country || 'Deutschland'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-700 font-medium truncate" title={`${user.billingAddress?.firstName || user.address?.firstName || user.firstName} ${user.billingAddress?.lastName || user.address?.lastName || user.lastName}`}>
                        {user.billingAddress?.firstName || user.address?.firstName || user.firstName} {user.billingAddress?.lastName || user.address?.lastName || user.lastName}
                      </p>
                      <p className="text-slate-600 truncate" title={`${user.billingAddress?.street} ${user.billingAddress?.houseNumber}${user.billingAddress?.addressLine2 ? `, ${user.billingAddress.addressLine2}` : ''}`}>
                        {user.billingAddress?.street} {user.billingAddress?.houseNumber}
                        {user.billingAddress?.addressLine2 && `, ${user.billingAddress.addressLine2}`}
                      </p>
                      <p className="text-slate-600 truncate" title={`${user.billingAddress?.postalCode} ${user.billingAddress?.city}`}>
                        {user.billingAddress?.postalCode} {user.billingAddress?.city}
                      </p>
                      <p className="text-slate-600 truncate" title={user.billingAddress?.country || 'Deutschland'}>{user.billingAddress?.country || 'Deutschland'}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Payment Method Card */}
              <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-4 sm:p-6 relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                <button 
                  onClick={() => {
                    setEditingSection('payment');
                    setIsEditing(true);
                  }}
                  className={withCursorPointer("absolute top-2 right-2 sm:top-4 sm:right-4 text-blue-600 text-xs sm:text-sm font-medium hover:text-blue-700 bg-blue-50 px-2 sm:px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors")}
                >
                  Bearbeiten
                </button>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-700 to-green-500 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Zahlungsmethode</h3>
                </div>
                <div className="flex items-center">
                  {user?.paymentMethod ? (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        {user.paymentMethod === 'card' && (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        )}
                        {user.paymentMethod === 'paypal' && (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        )}
                        {user.paymentMethod === 'bank' && (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )}
                      </div>
                      <span className="text-slate-800 font-medium">
                        {user.paymentMethod === 'card' && 'Kreditkarte'}
                        {user.paymentMethod === 'paypal' && 'PayPal'}
                        {user.paymentMethod === 'bank' && 'Banküberweisung'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-slate-600">Keine Zahlungsmethode hinterlegt</p>
                  )}
                </div>
              </div>

              {/* Bonuspunkte Card */}
              <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl p-4 sm:p-6 relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Bonuspunkte</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-medium">Bonuspunkte</span>
                    <span className="text-2xl font-bold text-yellow-600">{user.bonusPoints || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 lg:mb-6 gap-4">
              <div className="flex items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Letzte Bestellungen</h2>
                <div className="ml-2 sm:ml-4 w-8 sm:w-16 h-1 bg-gradient-to-r from-blue-800 to-blue-500 rounded-full"></div>
              </div>
              <Link href="/orders" prefetch className="text-blue-600 text-sm font-medium hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors self-start sm:self-auto">
                Alle ansehen
              </Link>
            </div>
            <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                    <tr>
                      <th className="w-24 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Bestellung #</th>
                      <th className="w-20 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Datum</th>
                      <th className="w-32 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">Senden an</th>
                      <th className="w-20 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Bestellwert</th>
                      <th className="w-32 px-3 sm:px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-slate-200">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 sm:px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <p className="text-slate-500 font-medium">Noch keine Bestellungen vorhanden</p>
                          <p className="text-slate-400 text-sm mt-1">Deine Bestellungen werden hier angezeigt</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                      orders.slice(0, 5).map((order, index) => {
                        const statusInfo = getStatusInfo(order.status);
                        return (
                          <tr key={order._id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-3 sm:px-6 py-4 text-center">
                              <span className="text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">
                                {order.orderNumber}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-slate-600 hidden sm:table-cell text-center">
                              {formatDate(order.createdAt)}
                            </td>
                            <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-slate-600 hidden md:table-cell text-center">
                              <div className="truncate" title={`${order.shippingAddress.street} ${order.shippingAddress.houseNumber}`}>
                                {order.shippingAddress.street} {order.shippingAddress.houseNumber}
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-semibold text-slate-800 text-center">
                              €{order.total.toFixed(2)}
                            </td>
                            <td className="px-3 sm:px-6 py-4">
                              <div className="whitespace-pre-line text-center">
                                <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`} title={statusInfo.text}>
                                  {statusInfo.text}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                {editingSection === 'contact' && 'Kontaktdaten bearbeiten'}
                {editingSection === 'shipping' && 'Versandadresse bearbeiten'}
                {editingSection === 'billing' && 'Rechnungsadresse bearbeiten'}
                {editingSection === 'payment' && 'Zahlungsmethode bearbeiten'}
              </h3>
              <button
                onClick={handleCancel}
                className={withCursorPointer("text-gray-400 hover:text-gray-600")}
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Contact Data Section */}
              {editingSection === 'contact' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anrede</label>
                    <select
                      value={formData.salutation ?? ''}
                      onChange={(e) => handleInputChange('salutation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">Bitte wählen</option>
                      <option value="Herr">Herr</option>
                      <option value="Frau">Frau</option>
                      <option value="Divers">Divers</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        maxLength={50}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        maxLength={50}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                      <p className="text-gray-900 py-2 text-sm">{user.email}</p>
                      <p className="text-xs text-gray-500">E-Mail kann nicht geändert werden</p>
                    </div>
                  </div>

                  <div>
                  </div>
                </>
              )}

              {/* Shipping Address Section */}
              {editingSection === 'shipping' && (
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-3">Versandadresse</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
                      <input
                        type="text"
                        value={formData.address.company ?? ''}
                        onChange={(e) => handleInputChange('address.company', e.target.value)}
                        maxLength={100}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Firmenname (optional)"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                        <input
                          type="text"
                          value={formData.address.firstName}
                          onChange={(e) => handleInputChange('address.firstName', e.target.value)}
                          maxLength={50}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                        <input
                          type="text"
                          value={formData.address.lastName}
                          onChange={(e) => handleInputChange('address.lastName', e.target.value)}
                          maxLength={50}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Straße</label>
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={(e) => handleInputChange('address.street', e.target.value)}
                        maxLength={100}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hausnummer</label>
                      <input
                        type="text"
                        value={formData.address.houseNumber}
                        onChange={(e) => handleInputChange('address.houseNumber', e.target.value)}
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adresszusatz</label>
                      <input
                        type="text"
                        value={formData.address.addressLine2}
                        onChange={(e) => handleInputChange('address.addressLine2', e.target.value)}
                        maxLength={100}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Wohnung, Etage, etc. (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                      <input
                        type="text"
                        value={formData.address.postalCode}
                        onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => handleInputChange('address.city', e.target.value)}
                        maxLength={50}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
                      <select
                        value={formData.address.country}
                        onChange={(e) => handleInputChange('address.country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="Deutschland">Deutschland</option>
                        <option value="Österreich">Österreich</option>
                        <option value="Schweiz">Schweiz</option>
                      </select>
                    </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Address Section */}
              {editingSection === 'billing' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-900">Rechnungsadresse</h4>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={useSameAddress}
                        onChange={(e) => {
                          setUseSameAddress(e.target.checked);
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              billingAddress: {
                                ...prev.address
                              }
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Gleich wie Versandadresse</span>
                    </label>
                  </div>
                  
                  {useSameAddress ? (
                    <p className="text-gray-500 italic text-sm">Rechnungsadresse ist identisch mit der Versandadresse</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
                        <input
                          type="text"
                          value={formData.billingAddress.company ?? ''}
                          onChange={(e) => handleInputChange('billingAddress.company', e.target.value)}
                          maxLength={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Firmenname (optional)"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                          <input
                            type="text"
                            value={formData.billingAddress.firstName}
                            onChange={(e) => handleInputChange('billingAddress.firstName', e.target.value)}
                            maxLength={50}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                          <input
                            type="text"
                            value={formData.billingAddress.lastName}
                            onChange={(e) => handleInputChange('billingAddress.lastName', e.target.value)}
                            maxLength={50}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Straße</label>
                        <input
                          type="text"
                          value={formData.billingAddress.street}
                          onChange={(e) => handleInputChange('billingAddress.street', e.target.value)}
                          maxLength={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hausnummer</label>
                        <input
                          type="text"
                          value={formData.billingAddress.houseNumber}
                          onChange={(e) => handleInputChange('billingAddress.houseNumber', e.target.value)}
                          maxLength={10}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresszusatz</label>
                        <input
                          type="text"
                          value={formData.billingAddress.addressLine2}
                          onChange={(e) => handleInputChange('billingAddress.addressLine2', e.target.value)}
                          maxLength={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Wohnung, Etage, etc. (optional)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                        <input
                          type="text"
                          value={formData.billingAddress.postalCode}
                          onChange={(e) => handleInputChange('billingAddress.postalCode', e.target.value)}
                          maxLength={10}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                        <input
                          type="text"
                          value={formData.billingAddress.city}
                          onChange={(e) => handleInputChange('billingAddress.city', e.target.value)}
                          maxLength={50}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
                        <select
                          value={formData.billingAddress.country}
                          onChange={(e) => handleInputChange('billingAddress.country', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="Deutschland">Deutschland</option>
                          <option value="Österreich">Österreich</option>
                          <option value="Schweiz">Schweiz</option>
                        </select>
                      </div>
                    </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method Section */}
              {editingSection === 'payment' && (
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-4">Zahlungsmethode</h4>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 border border-gray-300 rounded-lg">
                      <input
                        type="radio"
                        id="card"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === 'card'}
                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label htmlFor="card" className="ml-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Kreditkarte
                      </label>
                    </div>
                    <div className="flex items-center p-3 border border-gray-300 rounded-lg">
                      <input
                        type="radio"
                        id="paypal"
                        name="paymentMethod"
                        value="paypal"
                        checked={formData.paymentMethod === 'paypal'}
                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label htmlFor="paypal" className="ml-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        PayPal
                      </label>
                    </div>
                    <div className="flex items-center p-3 border border-gray-300 rounded-lg">
                      <input
                        type="radio"
                        id="bank"
                        name="paymentMethod"
                        value="bank"
                        checked={formData.paymentMethod === 'bank'}
                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label htmlFor="bank" className="ml-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Banküberweisung
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={handleCancel}
                className={withCursorPointer('px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200')}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 ${saving ? 'cursor-not-allowed' : withCursorPointer('')}`}
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Modal */}
      {showAccountSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Kontoeinstellungen</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-4">
                Hier können Sie verschiedene Kontoeinstellungen verwalten.
              </p>
              
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Gefährliche Aktionen</h4>
                  <p className="text-gray-600 text-sm mb-3">
                    Diese Aktionen können nicht rückgängig gemacht werden.
                  </p>
                  <button
                    onClick={() => {
                      setShowAccountSettingsModal(false);
                      setShowDeleteModal(true);
                    }}
                    className={withCursorPointer("px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors")}
                  >
                    Account löschen
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAccountSettingsModal(false)}
                className={withCursorPointer("px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200")}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Account löschen</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                <strong>Warnung:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
              <p className="text-gray-600 text-sm mb-4">
                Beim Löschen deines Accounts werden folgende Daten entfernt:
              </p>
              <ul className="text-gray-600 text-sm list-disc list-inside space-y-1 mb-4">
                <li>Alle deine persönlichen Daten</li>
                <li>Deine Bestellungen (werden anonymisiert)</li>
                <li>Deine Bewertungen</li>
                <li>Deine Bonuspunkte</li>
                <li>Deine Adressdaten</li>
              </ul>
              <p className="text-gray-600 text-sm mb-4">
                Nach der Löschung wirst du automatisch ausgeloggt und zur Startseite weitergeleitet.
              </p>
              
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium mb-2">
                  Zur Bestätigung geben Sie bitte "WIRKLICH LÖSCHEN" ein:
                </p>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="WIRKLICH LÖSCHEN"
                  className="w-full px-3 py-2 border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                />
                {deleteConfirmationText && deleteConfirmationText !== 'WIRKLICH LÖSCHEN' && (
                  <p className="text-red-600 text-xs mt-1">
                    Bitte geben Sie exakt "WIRKLICH LÖSCHEN" ein
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                disabled={deleting}
                className={`px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 ${deleting ? 'cursor-not-allowed' : withCursorPointer('')}`}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmationText !== 'WIRKLICH LÖSCHEN'}
                className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 ${(deleting || deleteConfirmationText !== 'WIRKLICH LÖSCHEN') ? 'cursor-not-allowed' : withCursorPointer('')}`}
              >
                {deleting ? 'Lösche...' : 'Account löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
