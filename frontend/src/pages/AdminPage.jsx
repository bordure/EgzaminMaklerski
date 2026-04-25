import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import {
  checkAdmin,
  adminFetchQuestions,
  adminUpdateQuestion,
  adminFetchReports,
  adminUpdateReport,
  adminDeleteReport,
  adminTriggerImport,
} from "../api";
const TABS = [
  { id: "reports", label: "Zgloszenia" },
  { id: "questions", label: "Pytania" },
];
const REASON_LABELS = {
  typo: "Literowka",
  wrong_answer: "Bledna odpowiedz",
  other: "Inny problem",
};
function QuestionEditor({ question, onSave, onCancel }) {
  const [fields, setFields] = useState({
    question: question.question ?? "",
    option_A: question.option_A ?? "",
    option_B: question.option_B ?? "",
    option_C: question.option_C ?? "",
    option_D: question.option_D ?? "",
    correct_answer: question.correct_answer ?? "A",
    domain: question.domain ?? "",
    section: question.section ?? "",
    topic: question.topic ?? "",
  });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(fields);
    } finally {
      setSaving(false);
    }
  };
  const inputClass =
    "w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Pytanie</label>
        <textarea
          rows={3}
          className={inputClass + " resize-none"}
          value={fields.question}
          onChange={(e) => setFields((f) => ({ ...f, question: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {["A", "B", "C", "D"].map((letter) => (
          <div key={letter}>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Odpowiedz {letter}</label>
            <input
              type="text"
              className={inputClass}
              value={fields[`option_${letter}`]}
              onChange={(e) =>
                setFields((f) => ({ ...f, [`option_${letter}`]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Poprawna odpowiedz</label>
          <select
            className={inputClass}
            value={fields.correct_answer}
            onChange={(e) => setFields((f) => ({ ...f, correct_answer: e.target.value }))}
          >
            {["A", "B", "C", "D"].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Domena</label>
          <input
            type="text"
            className={inputClass}
            value={fields.domain}
            onChange={(e) => setFields((f) => ({ ...f, domain: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sekcja</label>
          <input
            type="text"
            className={inputClass}
            value={fields.section}
            onChange={(e) => setFields((f) => ({ ...f, section: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Temat</label>
        <input
          type="text"
          className={inputClass}
          value={fields.topic}
          onChange={(e) => setFields((f) => ({ ...f, topic: e.target.value }))}
        />
      </div>
      <div className="flex gap-3 justify-end pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Anuluj
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Zapisywanie..." : "Zapisz"}
        </button>
      </div>
    </div>
  );
}
function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [adminNote, setAdminNote] = useState({});
  const [resolving, setResolving] = useState({});
  const [editingReport, setEditingReport] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchReports(showResolved ? {} : { resolved: false });
      setReports(data.reports ?? []);
    } finally {
      setLoading(false);
    }
  }, [showResolved]);
  useEffect(() => { load(); }, [load]);
  const handleResolve = async (id) => {
    setResolving((r) => ({ ...r, [id]: true }));
    try {
      await adminUpdateReport(id, { resolved: true, admin_note: adminNote[id] ?? "" });
      await load();
    } finally {
      setResolving((r) => ({ ...r, [id]: false }));
    }
  };
  const openQuestionEditor = useCallback(async (r) => {
    setEditingReport(r._id);
    setLoadingQuestion(true);
    setEditingQuestion(null);
    try {
      const data = await adminFetchQuestions({ search: r.question_text, n: 1 });
      const found = data.questions?.[0] ?? null;
      setEditingQuestion(found);
    } finally {
      setLoadingQuestion(false);
    }
  }, []);
  const handleSaveQuestion = async (reportId, questionId, fields) => {
    await adminUpdateQuestion(questionId, fields);
    setEditingReport(null);
    setEditingQuestion(null);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Usunac to zgloszenie?")) return;
    await adminDeleteReport(id);
    await load();
  };
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Zgloszenia uzytkownikow</h2>
        <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="accent-indigo-500"
          />
          Pokaz rozwiazane
        </label>
      </div>
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Ladowanie...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-500">Brak zgloszen.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div
              key={r._id}
              className={`rounded-xl border p-5 space-y-3 ${
                r.resolved
                  ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60"
                  : "border-indigo-300 dark:border-indigo-800 bg-white dark:bg-gray-800 shadow-[0_0_12px_rgba(99,102,241,0.1)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    r.reason === "wrong_answer"
                      ? "bg-red-900 text-red-300"
                      : r.reason === "typo"
                      ? "bg-yellow-900 text-yellow-300"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  {REASON_LABELS[r.reason] ?? r.reason}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString("pl-PL") : ""}
                </span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium line-clamp-3">
                {r.question_text}
              </p>
              {r.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">"{r.description}"</p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Zglasza:</span>
                <span className="text-gray-600 dark:text-gray-400">{r.reported_by}</span>
              </div>
              {editingReport === r._id && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {loadingQuestion ? (
                    <p className="text-sm text-gray-500">Ladowanie pytania...</p>
                  ) : editingQuestion ? (
                    <QuestionEditor
                      question={editingQuestion}
                      onSave={(fields) => handleSaveQuestion(r._id, editingQuestion._id, fields)}
                      onCancel={() => { setEditingReport(null); setEditingQuestion(null); }}
                    />
                  ) : (
                    <p className="text-sm text-red-500">Nie znaleziono pytania w bazie.</p>
                  )}
                </div>
              )}
              {r.resolved ? (
                <div className="text-xs text-green-500">
                  Rozwiazane {r.resolved_at ? new Date(r.resolved_at).toLocaleDateString("pl-PL") : ""}
                  {r.admin_note ? ` — ${r.admin_note}` : ""}
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Notatka admina (opcjonalnie)"
                      value={adminNote[r._id] ?? ""}
                      onChange={(e) =>
                        setAdminNote((n) => ({ ...n, [r._id]: e.target.value }))
                      }
                      className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => handleResolve(r._id)}
                      disabled={resolving[r._id]}
                      className="px-3 py-1.5 text-sm bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      Rozwiaz
                    </button>
                    <button
                      onClick={() => handleDelete(r._id)}
                      className="px-3 py-1.5 text-sm bg-red-900 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Usun
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      editingReport === r._id
                        ? (setEditingReport(null), setEditingQuestion(null))
                        : openQuestionEditor(r)
                    }
                    className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                  >
                    {editingReport === r._id ? "Zamknij edytor" : "Edytuj pytanie"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function QuestionsTab() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const PAGE_SIZE = 20;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchQuestions({ page, n: PAGE_SIZE, search: search || undefined });
      setQuestions(data.questions ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);
  useEffect(() => { load(); }, [load]);
  const handleSave = async (q, fields) => {
    await adminUpdateQuestion(q._id, fields);
    setEditingId(null);
    await load();
  };
  const totalPages = Math.ceil(total / PAGE_SIZE);
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Baza pytan</h2>
        <span className="text-sm text-gray-500">{total} pytan</span>
        <form
          className="flex gap-2 ml-auto"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput);
          }}
        >
          <input
            type="text"
            placeholder="Szukaj..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg transition-colors"
          >
            Szukaj
          </button>
        </form>
      </div>
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Ladowanie...</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q._id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              {editingId === q._id ? (
                <QuestionEditor
                  question={q}
                  onSave={(fields) => handleSave(q, fields)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 mb-1 line-clamp-2">{q.question}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{q.domain}</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{q.section}</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{q.topic}</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                        {q.correct_answer}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingId(q._id)}
                    className="shrink-0 text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                  >
                    Edytuj
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-30 transition-colors"
          >
            Poprzednia
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-30 transition-colors"
          >
            Nastepna
          </button>
        </div>
      )}
    </div>
  );
}
export default function AdminPage() {
  const [tab, setTab] = useState("reports");
  const [isAdmin, setIsAdmin] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); 
  useEffect(() => {
    checkAdmin()
      .then((d) => setIsAdmin(d.is_admin ?? false))
      .catch(() => setIsAdmin(false));
  }, []);
  const handleImport = async () => {
    if (!window.confirm("Reimportować wszystkie pliki JSON z Blob Storage do MongoDB?\nKolekcja zostanie zastąpiona.")) return;
    setImporting(true);
    setImportResult(null);
    try {
      const data = await adminTriggerImport(true);
      setImportResult({
        ok: true,
        message: `Zaimportowano ${data.total_inserted ?? "?"} pytań z ${(data.files_processed ?? []).length} plików.`,
      });
    } catch (err) {
      const detail = err?.response?.data?.detail ?? err.message ?? "Nieznany błąd";
      setImportResult({ ok: false, message: `Błąd importu: ${detail}` });
    } finally {
      setImporting(false);
    }
  };
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Sprawdzanie dostepu...</p>
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Panel administratora</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:opacity-60 text-white rounded-lg transition-colors"
            >
              {importing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Importowanie...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Reimport z Blob Storage
                </>
              )}
            </button>
          </div>
        </div>
        {importResult && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-4 ${
              importResult.ok
                ? "bg-green-900/30 border border-green-700 text-green-300"
                : "bg-red-900/30 border border-red-700 text-red-300"
            }`}
          >
            <span>{importResult.message}</span>
            <button
              onClick={() => setImportResult(null)}
              className="shrink-0 text-xs opacity-60 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex gap-1 mb-8 border-b border-gray-200 dark:border-gray-700">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
                tab === t.id
                  ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-gray-800"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "reports" ? <ReportsTab /> : <QuestionsTab />}
      </div>
    </div>
  );
}
