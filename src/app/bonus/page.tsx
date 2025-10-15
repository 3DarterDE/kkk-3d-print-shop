"use client";
import React from "react";
import { useUserData } from "@/lib/contexts/UserDataContext";
import { useAuth } from '@/lib/hooks/useAuth';
import Link from "next/link";
import { withCursorPointer } from '@/lib/cursor-utils';

type BonusGoal = {
  id: string;
  points: number;
  reward: string;
  description: string;
  color: string;
};

const bonusGoals: BonusGoal[] = [
  {
    id: 'goal-1',
    points: 1000,
    reward: 'Bis zu 5€ Rabatt',
    description: 'Erreiche 1.000 Bonuspunkte',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'goal-2',
    points: 2000,
    reward: 'Bis zu 10€ Rabatt',
    description: 'Erreiche 2.000 Bonuspunkte',
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'goal-3',
    points: 3000,
    reward: 'Bis zu 20€ Rabatt',
    description: 'Erreiche 3.000 Bonuspunkte',
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'goal-4',
    points: 4000,
    reward: 'Bis zu 35€ Rabatt',
    description: 'Erreiche 4.000 Bonuspunkte',
    color: 'from-orange-500 to-orange-600'
  },
  {
    id: 'goal-5',
    points: 5000,
    reward: 'Bis zu 50€ Rabatt',
    description: 'Erreiche 5.000 Bonuspunkte',
    color: 'from-red-500 to-red-600'
  }
];

export default function BonusPointsPage() {
  const { user, loading, error, orders, refetchOrders } = useUserData();
  const [showHistory, setShowHistory] = React.useState(false);
  const [entries, setEntries] = React.useState<any[]>([]);
  const [orderEntries, setOrderEntries] = React.useState<any[]>([]);
  const [reviewEntries, setReviewEntries] = React.useState<any[]>([]);
  const [returnEntries, setReturnEntries] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<'orders' | 'reviews' | 'returns'>('orders');
  const [currentPage, setCurrentPage] = React.useState(1);
  const { loading: authLoading, isAuthenticated } = useAuth();
  
  const ITEMS_PER_PAGE = 25;

  // Build bonus entries separated by type
  React.useEffect(() => {
    const buildEntries = async () => {
      try {
        const orderList: any[] = [];
        const reviewList: any[] = [];
        const returnList: any[] = [];
        const allList: any[] = [];

        // Process orders
        (orders || []).forEach((o: any) => {
          const orderNumber = o.orderNumber;
          const points = o.bonusPointsEarned || 0;
          if (points > 0) {
            if (o.bonusPointsScheduledAt && !o.bonusPointsCredited) {
              const entry = { kind: 'order', orderId: o._id, orderNumber, points, scheduledAt: o.bonusPointsScheduledAt, credited: false };
              orderList.push(entry);
              allList.push(entry);
            }
            if (o.bonusPointsCredited && o.bonusPointsCreditedAt) {
              const entry = { kind: 'order', orderId: o._id, orderNumber, points, credited: true, creditedAt: o.bonusPointsCreditedAt };
              orderList.push(entry);
              allList.push(entry);
            }
          }

          // Process return bonus points
          const returnPoints = o.bonusPointsCreditedReturn || 0;
          if (returnPoints > 0 && o.bonusPointsCreditedReturnAt) {
            const entry = { kind: 'return', orderId: o._id, orderNumber, points: returnPoints, credited: true, creditedAt: o.bonusPointsCreditedReturnAt };
            returnList.push(entry);
            allList.push(entry);
          }

          // Process unfrozen bonus points (not returned items)
          const unfrozenPoints = o.bonusPointsUnfrozen || 0;
          if (unfrozenPoints > 0 && o.bonusPointsUnfrozenAt) {
            const entry = { kind: 'unfrozen', orderId: o._id, orderNumber, points: unfrozenPoints, credited: true, creditedAt: o.bonusPointsUnfrozenAt };
            returnList.push(entry);
            allList.push(entry);
          }
        });

        // Process reviews
        if (orders && orders.length > 0) {
          const orderIds = orders.map((o: any) => o._id);
          const res = await fetch(`/api/reviews?orderId=${orderIds.join(',')}`);
          if (res.ok) {
            const data = await res.json();
            const reviews: any[] = data.reviews || [];
            const idToNumber: Record<string, string> = {};
            for (const o of orders as any[]) idToNumber[o._id] = o.orderNumber;
            reviews.forEach((r) => {
              const pts = r.bonusPointsAwarded || 0;
              if (pts <= 0) return;
              const orderNumber = idToNumber[r.orderId] || r.orderId;
              if (r.bonusPointsScheduledAt && !r.bonusPointsCredited) {
                const entry = { kind: 'review', orderId: r.orderId, reviewId: r._id, orderNumber, points: pts, scheduledAt: r.bonusPointsScheduledAt, credited: false };
                reviewList.push(entry);
                allList.push(entry);
              }
              if (r.bonusPointsCredited && r.bonusPointsCreditedAt) {
                const entry = { kind: 'review', orderId: r.orderId, reviewId: r._id, orderNumber, points: pts, credited: true, creditedAt: r.bonusPointsCreditedAt };
                reviewList.push(entry);
                allList.push(entry);
              }
            });
          }
        }

        // Sort all entries by date (newest first)
        const sortByDate = (list: any[]) => {
          return list.sort((a, b) => {
            const dateA = a.credited ? new Date(a.creditedAt).getTime() : new Date(a.scheduledAt).getTime();
            const dateB = b.credited ? new Date(b.creditedAt).getTime() : new Date(b.scheduledAt).getTime();
            return dateB - dateA; // Newest first
          });
        };

        setOrderEntries(sortByDate(orderList));
        setReviewEntries(sortByDate(reviewList));
        setReturnEntries(sortByDate(returnList));
        setEntries(sortByDate(allList));
      } catch {
        setOrderEntries([]);
        setReviewEntries([]);
        setReturnEntries([]);
        setEntries([]);
      }
    };

    buildEntries();
  }, [orders]);

  if ((authLoading || loading) && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 h-48">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
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
          <p className="text-gray-600 mb-4">Bitte melde dich an, um deine Bonuspunkte zu sehen.</p>
          <a
            href="/api/auth/login"
            className={withCursorPointer("bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors")}
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
          <p className="text-gray-600 mb-4">Die Bonuspunkte konnten nicht geladen werden.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4 py-8">
          <div className="animate-pulse h-32 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const currentPoints = user.bonusPoints || 0;

  const getProgressPercentage = (goalPoints: number) => {
    return Math.min((currentPoints / goalPoints) * 100, 100);
  };

  const getNextGoal = () => {
    return bonusGoals.find(goal => currentPoints < goal.points);
  };

  const getCompletedGoals = () => {
    return bonusGoals.filter(goal => currentPoints >= goal.points);
  };

  const nextGoal = getNextGoal();
  const completedGoals = getCompletedGoals();

  // Pagination logic
  const getCurrentEntries = () => {
    switch (activeTab) {
      case 'orders': return orderEntries;
      case 'reviews': return reviewEntries;
      case 'returns': return returnEntries;
      default: return entries;
    }
  };

  const currentEntries = getCurrentEntries();
  const totalPages = Math.ceil(currentEntries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEntries = currentEntries.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  const handleTabChange = (tab: 'orders' | 'reviews' | 'returns') => {
    setActiveTab(tab);
    resetPagination();
  };

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
                <Link href="/profile" prefetch className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                  <div className="w-2 h-2 bg-slate-300 rounded-full mr-3 group-hover:bg-blue-500 transition-colors"></div>
                  Benutzerkonto Übersicht
                </Link>
                <Link href="/orders" prefetch className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                  <div className="w-2 h-2 bg-slate-300 rounded-full mr-3 group-hover:bg-blue-500 transition-colors"></div>
                  Meine Bestellungen
                </Link>
                <a href="#" className="flex items-center px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-800 to-blue-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Bonuspunkte
                </a>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 py-4 lg:py-8">
            {/* Header */}
            <div className="mb-8">
          {/* Current Points Card */}
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 lg:mb-3">Aktuelles Guthaben</h2>
                <p className="text-blue-100 text-sm sm:text-base lg:text-lg">Deine gesammelten Bonuspunkte</p>
              </div>
              <div className="text-right">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold">{currentPoints.toLocaleString()}</div>
                <div className="text-blue-100 text-sm sm:text-base lg:text-lg">Punkte</div>
              </div>
            </div>
            <div className="mt-4">
              <button onClick={() => { setShowHistory(true); resetPagination(); refetchOrders?.(); }} className={withCursorPointer("px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors")}>
                Verlauf ansehen
              </button>
            </div>
          </div>
        </div>

        {/* Next Goal */}
        {nextGoal && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Nächstes Ziel</h3>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-white/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-slate-800">{nextGoal.description}</h4>
                  <p className="text-slate-600">Belohnung: {nextGoal.reward}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-800">{nextGoal.points.toLocaleString()}</div>
                  <div className="text-sm text-slate-600">Punkte</div>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>{currentPoints.toLocaleString()} Punkte</span>
                  <span>{nextGoal.points.toLocaleString()} Punkte</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`bg-gradient-to-r ${nextGoal.color} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${getProgressPercentage(nextGoal.points)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                Noch {(nextGoal.points - currentPoints).toLocaleString()} Punkte bis zum Ziel
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistory && (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => setShowHistory(false)}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-100 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Bonuspunkte-Verlauf</h3>
          <button 
            onClick={() => setShowHistory(false)} 
            className={withCursorPointer("p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-4 sm:p-6">
            {/* Tabs - Mobile Optimized */}
            <div className="mb-6">
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => handleTabChange('orders')}
                  className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${withCursorPointer('')} ${
                    activeTab === 'orders'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <div className="hidden sm:block">Bestellungen ({orderEntries.length})</div>
                  <div className="sm:hidden">Bestell. ({orderEntries.length})</div>
                </button>
                <button
                  onClick={() => handleTabChange('reviews')}
                  className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${withCursorPointer('')} ${
                    activeTab === 'reviews'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <div className="hidden sm:block">Bewertungen ({reviewEntries.length})</div>
                  <div className="sm:hidden">Bewert. ({reviewEntries.length})</div>
                </button>
                <button
                  onClick={() => handleTabChange('returns')}
                  className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${withCursorPointer('')} ${
                    activeTab === 'returns'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <div className="hidden sm:block">Rücksendungen ({returnEntries.length})</div>
                  <div className="sm:hidden">Rück. ({returnEntries.length})</div>
                </button>
              </div>
            </div>

            {currentEntries.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl text-slate-600 text-center">
                <div className="text-4xl mb-2">📊</div>
                <div className="text-sm">Keine Einträge vorhanden.</div>
              </div>
            ) : (
              <>
                {/* Mobile Card View for Entries */}
                <div className="space-y-3">
                  {paginatedEntries.map((entry, idx) => (
                    <div key={startIndex + idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              entry.kind === 'order' ? 'bg-blue-100' : 
                              entry.kind === 'review' ? 'bg-yellow-100' : 
                              entry.kind === 'unfrozen' ? 'bg-blue-100' : 'bg-purple-100'
                            }`}>
                              {entry.kind === 'order' && (
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                              {entry.kind === 'review' && (
                                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              )}
                              {entry.kind === 'unfrozen' && (
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-700">
                                {entry.kind === 'order' ? 'Bestellung' : entry.kind === 'review' ? 'Bewertung' : entry.kind === 'unfrozen' ? 'Freigegeben' : 'Rücksendung'}
                                {entry.orderNumber && (
                                  <span className="ml-2 text-slate-500">#{entry.orderNumber}</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {entry.credited ? (
                                  <span className="text-green-700 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Gutgeschrieben am {new Date(entry.creditedAt).toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                  </span>
                                ) : (
                                  <span className="text-blue-700 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    Geplante Gutschrift am {new Date(entry.scheduledAt).toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${entry.credited ? 'text-green-600' : 'text-yellow-600'}`}>
                          +{entry.points}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            
            {/* Pagination - Mobile Optimized */}
            {totalPages > 1 && (
              <div className="mt-6">
                {/* Mobile Pagination */}
                <div className="sm:hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-slate-600">
                      {startIndex + 1}-{Math.min(endIndex, currentEntries.length)} von {currentEntries.length}
                    </div>
                    <div className="text-xs text-slate-500">
                      Seite {currentPage} von {totalPages}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center ${currentPage === 1 ? 'cursor-not-allowed' : withCursorPointer('')}`}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Zurück
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage <= 2) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 1) {
                          pageNum = totalPages - 2 + i;
                        } else {
                          pageNum = currentPage - 1 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 text-sm rounded-lg ${withCursorPointer('')} ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center ${currentPage === totalPages ? 'cursor-not-allowed' : withCursorPointer('')}`}
                    >
                      Weiter
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Desktop Pagination */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Zeige {startIndex + 1}-{Math.min(endIndex, currentEntries.length)} von {currentEntries.length} Einträgen
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 ${currentPage === 1 ? 'cursor-not-allowed' : withCursorPointer('')}`}
                    >
                      Zurück
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 text-sm rounded-lg ${withCursorPointer('')} ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 ${currentPage === totalPages ? 'cursor-not-allowed' : withCursorPointer('')}`}
                    >
                      Weiter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </div>
    </div>
        )}

        {/* All Goals */}
        <div>
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Alle Ziele</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bonusGoals.map((goal) => {
              const isCompleted = currentPoints >= goal.points;
              const progress = getProgressPercentage(goal.points);
              
              return (
                <div 
                  key={goal.id} 
                  className={`bg-white rounded-2xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl ${
                    isCompleted ? 'border-green-200 bg-green-50' : 'border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800">{goal.description}</h4>
                      <p className="text-slate-600">Belohnung: {goal.reward}</p>
                    </div>
                    {isCompleted && (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>{currentPoints.toLocaleString()}</span>
                      <span>{goal.points.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isCompleted 
                            ? 'bg-gradient-to-r from-green-500 to-green-600' 
                            : `bg-gradient-to-r ${goal.color}`
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600">
                    {isCompleted ? (
                      <span className="text-green-600 font-medium">✓ Ziel erreicht!</span>
                    ) : (
                      <span>Noch {(goal.points - currentPoints).toLocaleString()} Punkte</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

          </div>
        </div>
      </div>
    </div>
  );
}
