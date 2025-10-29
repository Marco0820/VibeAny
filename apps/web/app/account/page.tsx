"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBase } from '@/lib/env';

type MinimalProvider = { id: string; name: string };

const API_BASE = getApiBase();

const FALLBACK_PROVIDERS: MinimalProvider[] = [
  { id: 'google', name: 'Google' },
  { id: 'github', name: 'GitHub' },
];

type PointsSummary = {
  balance: number;
  lifetime_recharged: number;
  lifetime_consumed: number;
};

type PointTransaction = {
  id: string;
  type: string;
  change: number;
  description?: string | null;
  balance_after: number;
  metadata?: Record<string, unknown>;
  created_at: string;
};

type RechargePlan = {
  id: string;
  name: string;
  description: string;
  points: number;
  price: number;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function providerLabel(provider?: string | null) {
  if (!provider) {
    return 'Unknown provider';
  }
  switch (provider) {
    case 'google':
      return 'Google';
    case 'github':
      return 'GitHub';
    default:
      return provider;
  }
}

function formatPoints(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatChange(value: number) {
  return `${value > 0 ? '+' : ''}${value}`;
}

function transactionTypeLabel(type: string) {
  switch (type) {
    case 'recharge':
      return 'Points top-up';
    case 'usage':
      return 'Service usage';
    case 'adjustment':
      return 'Manual adjustment';
    case 'refund':
      return 'Points refund';
    default:
      return type;
  }
}

export default function AccountPage() {
  const { user, loading, providers, openLogin, loginWithOAuth, logout, refreshUser } = useAuth();
  const loginOptions = useMemo<MinimalProvider[]>(() => (
    providers.length ? providers : FALLBACK_PROVIDERS
  ), [providers]);

  const [pointsSummary, setPointsSummary] = useState<PointsSummary | null>(null);
  const [usageCosts, setUsageCosts] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [plans, setPlans] = useState<RechargePlan[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeRecharge, setActiveRecharge] = useState<string | null>(null);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      ...init,
    });

    if (!response.ok) {
      let message = 'Request failed';
      try {
        const data = await response.json();
        message = data.detail || data.message || message;
      } catch (error) {
        message = error instanceof Error ? error.message : message;
      }
      throw new Error(message);
    }

    return response.json();
  }, []);

  const loadPointsData = useCallback(async () => {
    if (!user) {
      setPointsSummary(null);
      setTransactions([]);
      setPlans([]);
      setPointsLoading(false);
      return;
    }

    setPointsLoading(true);
    setPointsError(null);
    try {
      const [summaryData, historyData, plansData] = await Promise.all([
        request('/api/points/balance'),
        request('/api/points/history?limit=20'),
        request('/api/points/plans'),
      ]);

      setPointsSummary(summaryData.summary ?? null);
      if (summaryData.usage_costs) {
        setUsageCosts(summaryData.usage_costs);
      }
      setTransactions(historyData.items ?? []);
      setPlans(plansData.plans ?? []);
      if (plansData.usage_costs) {
        setUsageCosts(plansData.usage_costs);
      }
    } catch (error) {
      setPointsError(error instanceof Error ? error.message : 'Failed to load points data');
    } finally {
      setPointsLoading(false);
    }
  }, [request, user]);

  const handleRecharge = useCallback(async (planId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setActiveRecharge(planId);
    try {
      await request('/api/points/recharge', {
        method: 'POST',
        body: JSON.stringify({ package_id: planId }),
      });
      setActionSuccess('Recharge successful. Points are now available.');
      await refreshUser();
      await loadPointsData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Recharge failed. Please try again later.');
    } finally {
      setActiveRecharge(null);
    }
  }, [loadPointsData, refreshUser, request]);

  useEffect(() => {
    if (user) {
      loadPointsData();
    }
  }, [user, loadPointsData]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">Account dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage sign-in methods and keep your account secure.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition"
        >
          Back to home
        </Link>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 p-8 text-center text-gray-500 dark:text-gray-400">
          Loading account information…
        </div>
      ) : user ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 shadow-sm p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || user.email || 'User avatar'}
                    className="w-20 h-20 rounded-2xl border border-gray-200 dark:border-gray-700 object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl font-semibold text-gray-600 dark:text-gray-200">
                    {(user.name || user.email || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-white">
                    {user.name || user.email || 'VibeAny user'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Signed in via {providerLabel(user.provider)}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10">
                    Lv.{user.level}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-200">
                    {user.points} pts
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Last sign-in: {formatDate(user.last_login_at)}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Email
                </div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-all">
                  {user.email || 'Not provided'}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  User ID
                </div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-all">
                  {user.id}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => logout('/')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 dark:border-red-500/40 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition"
              >
                Sign out
              </button>
              <button
                type="button"
                onClick={refreshUser}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                Refresh
              </button>
            </div>
          </div>

          {(actionSuccess || actionError || pointsError) && (
            <div className="space-y-2">
              {actionSuccess && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
                  {actionSuccess}
                </div>
              )}
              {actionError && (
                <div className="rounded-2xl border border-red-200 dark:border-red-500/40 bg-red-50/70 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-200">
                  {actionError}
                </div>
              )}
              {pointsError && (
                <div className="rounded-2xl border border-yellow-200 dark:border-yellow-500/40 bg-yellow-50/70 dark:bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-100">
                  {pointsError}
                </div>
              )}
            </div>
          )}

          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Points overview</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Top-ups are applied instantly and can be used across VibeAny services at any time.</p>
              </div>
              {Object.keys(usageCosts).length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-3 py-2 rounded-xl">
                  Typical usage cost: create project {usageCosts.project_creation ?? 0} pts · run command {usageCosts.act_execution ?? 0} pts
                </div>
              )}
            </div>

            <div className="mt-6">
              {pointsLoading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading points data…</div>
              ) : pointsSummary ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Current balance</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatPoints(pointsSummary.balance)}</div>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Total top-ups</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatPoints(pointsSummary.lifetime_recharged)}</div>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Total spent</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatPoints(pointsSummary.lifetime_consumed)}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No points data yet. Complete your first top-up to unlock more features.</div>
              )}
            </div>

            {plans.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-3">Quick top-up</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {plans.map((plan) => (
                    <div key={plan.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
                      <div>
                        <div className="text-base font-semibold text-gray-900 dark:text-white">{plan.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                        <span>{formatPoints(plan.points)} pts</span>
                        <span className="font-semibold text-gray-900 dark:text-white">¥{plan.price}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRecharge(plan.id)}
                        disabled={activeRecharge === plan.id}
                        className={`inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-xl transition ${activeRecharge === plan.id ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'}`}
                      >
                        {activeRecharge === plan.id ? 'Processing…' : 'Top up now'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Points history</h2>
            {pointsLoading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading point transactions…</div>
            ) : transactions.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {transactions.map((tx) => (
                  <li key={tx.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{transactionTypeLabel(tx.type)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(tx.created_at)}
                      </div>
                      {tx.description && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {tx.description}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${tx.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {formatChange(tx.change)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Balance {formatPoints(tx.balance_after)} pts</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">No point transactions yet.</div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Third-party sign-in</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Use any of the providers below to sign in to VibeAny.
            </p>
            <div className="flex flex-wrap gap-3">
              {loginOptions.map((provider) => {
                const classes = provider.id === 'google'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : provider.id === 'github'
                    ? 'bg-gray-900 hover:bg-gray-800 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900';
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => {
                      if (provider.id === 'google') {
                        openLogin('/account');
                      } else {
                        loginWithOAuth(provider.id, '/account');
                      }
                    }}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl transition ${classes}`}
                  >
                    Sign in with {provider.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-gray-900/80 p-10 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Sign in to access your dashboard</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Choose a provider to sign in. After authorization you will be redirected back to this page.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {loginOptions.map((provider) => {
              const classes = provider.id === 'google'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : provider.id === 'github'
                  ? 'bg-gray-900 hover:bg-gray-800 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900';
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    if (provider.id === 'google') {
                      openLogin('/account');
                    } else {
                      loginWithOAuth(provider.id, '/account');
                    }
                  }}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl transition ${classes}`}
                >
                  Sign in with {provider.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
