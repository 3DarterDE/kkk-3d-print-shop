'use client';

import { useState, useEffect } from 'react';

interface ReviewTimer {
  _id: string;
  type: 'review' | 'admin';
  userId: {
    firstName: string;
    lastName: string;
    email: string;
  };
  productId?: string;
  orderId: string;
  rating?: number;
  title?: string;
  comment?: string;
  bonusPointsAwarded?: number;
  pointsAwarded?: number;
  reason?: string;
  awardedBy?: string;
  awardedByUser?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  bonusPointsCredited: boolean;
  bonusPointsCreditedAt?: string;
  bonusPointsScheduledAt: string;
  createdAt: string;
  orderNumber: string;
  orderStatus: string;
  orderCreatedAt: string;
}

interface TimerStats {
  total: number;
  pending: number;
  ready: number;
  credited: number;
  totalPendingPoints: number;
}

export default function BonusPointTimersPage() {
  const [reviews, setReviews] = useState<ReviewTimer[]>([]);
  const [stats, setStats] = useState<TimerStats>({
    total: 0,
    pending: 0,
    ready: 0,
    credited: 0,
    totalPendingPoints: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTimers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/bonus-point-timers?status=${statusFilter}&search=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      
      if (data.success) {
        setReviews(data.reviews);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching timers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimers();
  }, [statusFilter, searchTerm]);

  const handleAction = async (action: string, reviewId: string) => {
    try {
      setActionLoading(reviewId);
      const response = await fetch('/api/admin/bonus-point-timers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        fetchTimers(); // Refresh data
      } else {
        alert(data.error || 'Fehler bei der Aktion');
      }
    } catch (error) {
      console.error('Error processing action:', error);
      alert('Fehler bei der Aktion');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (review: ReviewTimer) => {
    if (review.bonusPointsCredited) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Gutgeschrieben</span>;
    }
    
    const scheduledDate = new Date(review.bonusPointsScheduledAt);
    const now = new Date();
    
    if (scheduledDate <= now) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Bereit</span>;
    } else {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Wartend</span>;
    }
  };

  const getDaysUntilCredit = (scheduledDate: string) => {
    const scheduled = new Date(scheduledDate);
    const now = new Date();
    const diffTime = scheduled.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bonuspunkte-Timer Verwaltung</h1>
        <p className="text-gray-600">Verwalte laufende Bonuspunkte-Timer für Bewertungen</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Gesamt</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Wartend</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">{stats.ready}</div>
          <div className="text-sm text-gray-600">Bereit</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{stats.credited}</div>
          <div className="text-sm text-gray-600">Gutgeschrieben</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{stats.totalPendingPoints}</div>
          <div className="text-sm text-gray-600">Ausstehende Punkte</div>
        </div>
      </div>

      {/* Filter and Actions */}
      <div className="mb-4 flex justify-between items-center gap-4">
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle Timer</option>
            <option value="pending">Wartend</option>
            <option value="ready">Bereit zur Gutschrift</option>
            <option value="credited">Bereits gutgeschrieben</option>
          </select>
          
          <input
            type="text"
            placeholder="Nach Kunde suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        
        {stats.ready > 0 && (
          <button
            onClick={async () => {
              if (confirm(`Möchtest du alle ${stats.ready} bereiten Bonuspunkte gutschreiben?`)) {
                try {
                  setActionLoading('all');
                  const response = await fetch('/api/admin/credit-all-ready-bonus-points', {
                    method: 'POST'
                  });
                  const data = await response.json();
                  
                  if (data.success) {
                    alert(data.message);
                    fetchTimers(); // Refresh data
                  } else {
                    alert(data.error || 'Fehler beim Gutschreiben');
                  }
                } catch (error) {
                  console.error('Error crediting all points:', error);
                  alert('Fehler beim Gutschreiben');
                } finally {
                  setActionLoading(null);
                }
              }
            }}
            disabled={actionLoading === 'all'}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading === 'all' ? 'Gutschreiben...' : `Alle ${stats.ready} gutschreiben`}
          </button>
        )}
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Lade Timer...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Keine Timer gefunden</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bestellung
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bonuspunkte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Geplant für
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr key={review._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {review.userId.firstName} {review.userId.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{review.userId.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{review.orderNumber}</div>
                      <div className="text-sm text-gray-500">{review.orderStatus}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {review.type === 'review' ? 'Bewertung' : 'Admin-Bonus'}
                      </div>
                      {review.type === 'admin' && review.awardedByUser && (
                        <div className="text-sm text-gray-500">
                          von {review.awardedByUser.firstName} {review.awardedByUser.lastName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {review.type === 'review' ? (
                        <div>
                          <div className="text-sm text-gray-900">{review.productId}</div>
                          <div className="flex items-center mt-1">
                            <span className="text-yellow-400">
                              {'★'.repeat(review.rating || 0)}
                              {'☆'.repeat(5 - (review.rating || 0))}
                            </span>
                            <span className="ml-2 text-sm text-gray-600">{review.rating}/5</span>
                          </div>
                          {review.title && (
                            <div className="text-sm text-gray-500 mt-1">{review.title}</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm text-gray-900">{review.reason}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {(review.bonusPointsAwarded || review.pointsAwarded || 0)} Punkte
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(review)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(review.bonusPointsScheduledAt)}
                      </div>
                      {!review.bonusPointsCredited && (
                        <div className="text-sm text-gray-500">
                          {getDaysUntilCredit(review.bonusPointsScheduledAt)} Tage
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!review.bonusPointsCredited && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAction('credit_now', review._id)}
                            disabled={actionLoading === review._id}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading === review._id ? '...' : 'Jetzt gutschreiben'}
                          </button>
                          <button
                            onClick={() => handleAction('extend', review._id)}
                            disabled={actionLoading === review._id}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {actionLoading === review._id ? '...' : '+1 Woche'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Bonuspunkte-Timer wirklich stornieren?')) {
                                handleAction('cancel', review._id);
                              }
                            }}
                            disabled={actionLoading === review._id}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {actionLoading === review._id ? '...' : 'Stornieren'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
