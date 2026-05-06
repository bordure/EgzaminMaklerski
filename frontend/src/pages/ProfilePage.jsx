import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { fetchUserStats, fetchLearningAdvice } from "../api";
import guestAvatar from "../assets/images/guest-avatar.svg";
const ADVICE_LS_KEY = "learning_advice_cache";
function loadAdviceCache() {
  try {
    return JSON.parse(localStorage.getItem(ADVICE_LS_KEY)) ?? null;
  } catch {
    return null;
  }
}
function saveAdviceCache(payload) {
  localStorage.setItem(ADVICE_LS_KEY, JSON.stringify(payload));
}
function isRateLimited(nextAvailableAt) {
  if (!nextAvailableAt) return false;
  return new Date(nextAvailableAt) > new Date();
}
function formatTimeUntil(nextAvailableAt) {
  if (!nextAvailableAt) return "";
  const ms = new Date(nextAvailableAt) - new Date();
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `Następna: za ${h}h ${m}min`;
  return `Następna: za ${m}min`;
}
function StatCard({ label, value, color = "text-gray-900 dark:text-gray-100" }) {
  return (
    <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-700 rounded-xl p-4 min-w-[90px]">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">{label}</span>
    </div>
  );
}
export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adviceCache, setAdviceCache] = useState(() => loadAdviceCache());
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState(null);
  const [timeLabel, setTimeLabel] = useState("");
  useEffect(() => {
    if (!adviceCache?.next_available_at) return;
    setTimeLabel(formatTimeUntil(adviceCache.next_available_at));
    const id = setInterval(() => {
      setTimeLabel(formatTimeUntil(adviceCache.next_available_at));
    }, 60_000);
    return () => clearInterval(id);
  }, [adviceCache?.next_available_at]);
  useEffect(() => {
    if (user?.guest) return;
    setLoading(true);
    fetchUserStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [user]);
  const handleAdvice = async () => {
    setAdviceLoading(true);
    setAdviceError(null);
    try {
      const data = await fetchLearningAdvice();
      const cache = { advice: data.advice, next_available_at: data.next_available_at };
      setAdviceCache(cache);
      saveAdviceCache(cache);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 429 && typeof detail === "object") {
        const cache = { advice: adviceCache?.advice ?? null, next_available_at: detail.next_available_at };
        setAdviceCache(cache);
        saveAdviceCache(cache);
        setAdviceError("Limit 1 rekomendacja dziennie osiągnięty.");
      } else {
        setAdviceError(typeof detail === "string" ? detail : "Błąd podczas pobierania rekomendacji.");
      }
    } finally {
      setAdviceLoading(false);
    }
  };
  const rateLimited = isRateLimited(adviceCache?.next_available_at);
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      {}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center gap-4">
        <img
          src={user?.guest ? guestAvatar : (user?.picture || guestAvatar)}
          alt={user?.name || "Uzytkownik"}
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.src = guestAvatar; }}
          className={`w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-600 object-cover ${
            user?.guest ? "dark:invert" : ""
          }`}
        />
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {user?.guest ? "Gość" : user?.name}
          </h1>
          {!user?.guest && user?.email && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
          )}
        </div>
      </div>
      {}
      {!user?.guest && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Statystyki</h2>
          {loading && (
            <p className="text-sm text-gray-400 dark:text-gray-500">Ładowanie statystyk...</p>
          )}
          {!loading && stats && (
            <>
              {}
              <div className="flex flex-wrap gap-3 justify-center mb-6">
                <StatCard label="Odpowiedziano" value={stats.total_answered} />
                <StatCard
                  label="Poprawnie"
                  value={stats.total_correct}
                  color="text-green-600 dark:text-green-400"
                />
                <StatCard
                  label="Błędnie"
                  value={stats.total_wrong}
                  color="text-red-600 dark:text-red-400"
                />
                <StatCard
                  label="Skuteczność"
                  value={`${stats.accuracy_pct}%`}
                  color={
                    stats.accuracy_pct >= 67
                      ? "text-green-600 dark:text-green-400"
                      : "text-orange-500 dark:text-orange-400"
                  }
                />
              </div>
              {}
              {stats.by_domain.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                    Wg dziedziny
                  </h3>
                  <div className="space-y-2">
                    {stats.by_domain.map((row) => (
                      <div key={row.domain} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300 w-48 truncate" title={row.domain}>
                          {row.domain || "—"}
                        </span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${row.accuracy_pct >= 67 ? "bg-green-500" : "bg-orange-400"}`}
                            style={{ width: `${row.accuracy_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
                          {row.correct}/{row.answered} ({row.accuracy_pct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {}
              {stats.by_topic.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                    Top tematy (ostatnie 20)
                  </h3>
                  <div className="space-y-2">
                    {stats.by_topic.map((row, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span
                          className="text-sm text-gray-700 dark:text-gray-300 w-48 truncate"
                          title={row.topic}
                        >
                          {row.topic || "—"}
                        </span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${row.accuracy_pct >= 67 ? "bg-green-500" : "bg-orange-400"}`}
                            style={{ width: `${row.accuracy_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
                          {row.correct}/{row.answered} ({row.accuracy_pct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {stats.total_answered === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                  Brak danych. Odpowiedz na pierwsze pytanie, aby zobaczyć statystyki.
                </p>
              )}
            </>
          )}
        </div>
      )}
      {}
      {!user?.guest && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Rekomendacja nauki</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Spersonalizowany plan nauki oparty na Twoich wynikach · limit 1 dziennie
              </p>
            </div>
            <button
              onClick={handleAdvice}
              disabled={adviceLoading || rateLimited}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {adviceLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analizuję...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  {rateLimited ? "Użyto dziś" : "Wygeneruj rekomendację"}
                </>
              )}
            </button>
          </div>
          {timeLabel && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{timeLabel}</p>
          )}
          {adviceError && (
            <p className="text-sm text-red-500 dark:text-red-400 mb-3">{adviceError}</p>
          )}
          {adviceCache?.advice && (
            <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-700/60 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
              {adviceCache.advice}
            </div>
          )}
          {!adviceCache?.advice && !adviceLoading && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Kliknij przycisk, aby AI przeanalizowało Twoje wyniki i zaproponowało plan nauki.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
