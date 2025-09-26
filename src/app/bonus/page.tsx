"use client";
import { useUserData } from "@/lib/contexts/UserDataContext";
import { useAuth } from '@/lib/hooks/useAuth';
import Link from "next/link";

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
  const { user, loading, error } = useUserData();
  const { loading: authLoading, isAuthenticated } = useAuth();

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
                <a href="#" className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                  <div className="w-2 h-2 bg-slate-300 rounded-full mr-3 group-hover:bg-blue-500 transition-colors"></div>
                  Mein Wunschzettel
                </a>
                <a href="#" className="flex items-center px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group">
                  <div className="w-2 h-2 bg-slate-300 rounded-full mr-3 group-hover:bg-blue-500 transition-colors"></div>
                  Newsletter
                </a>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 py-4 lg:py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Meine Bonuspunkte</h1>
                <p className="text-slate-600">Sammle Punkte und erreiche deine Ziele!</p>
              </div>

          {/* Current Points Card */}
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-xl mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Aktuelles Guthaben</h2>
                <p className="text-yellow-100">Deine gesammelten Bonuspunkte</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold">{currentPoints.toLocaleString()}</div>
                <div className="text-yellow-100 text-sm">Punkte</div>
              </div>
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

        {/* Completed Goals Summary */}
        {completedGoals.length > 0 && (
          <div className="mt-8">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-800">Erreichte Ziele</h3>
              </div>
              <p className="text-green-700 mb-4">
                Glückwunsch! Du hast bereits {completedGoals.length} von {bonusGoals.length} Zielen erreicht.
              </p>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Hinweis:</strong> Du kannst deine {currentPoints} Bonuspunkte als Rabatt bei der nächsten Bestellung einlösen. 
                  Je mehr Punkte du hast, desto höher ist der maximale Rabatt, den du erhalten kannst.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {completedGoals.map((goal) => (
                  <span 
                    key={goal.id}
                    className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {goal.reward}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
