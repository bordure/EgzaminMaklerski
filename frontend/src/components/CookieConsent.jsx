import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { initGA } from "../utils/analytics";

export const CONSENT_KEY = "cookieConsent";

export function getConsent() {
  return localStorage.getItem(CONSENT_KEY); // 'accepted' | 'rejected' | null
}

export function setConsent(value) {
  localStorage.setItem(CONSENT_KEY, value);
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      setVisible(true);
    } else if (consent === "accepted") {
      initGA();
    }
  }, []);

  const handleAccept = () => {
    setConsent("accepted");
    initGA();
    setVisible(false);
  };

  const handleReject = () => {
    setConsent("rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Zgoda na pliki cookie"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg px-4 py-4"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
          <p>
            Używamy plików cookie i Google Analytics do analizy ruchu oraz poprawy
            jakości serwisu. Możesz zaakceptować lub odrzucić cookies analityczne.
            Szczegóły znajdziesz w{" "}
            <Link
              to="/privacy"
              className="underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
            >
              Polityce Prywatności
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleReject}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Odmów
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Akceptuj
          </button>
        </div>
      </div>
    </div>
  );
}
