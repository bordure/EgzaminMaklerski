import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getConsent, setConsent, CONSENT_KEY } from "../components/CookieConsent";
import { initGA } from "../utils/analytics";

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">{title}</h2>
      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicy() {
  const [consent, setConsentState] = useState(() => getConsent());

  const handleAccept = () => {
    setConsent("accepted");
    setConsentState("accepted");
    initGA();
  };

  const handleReject = () => {
    setConsent("rejected");
    setConsentState("rejected");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Polityka Prywatności
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
        Ostatnia aktualizacja: 16 maja 2026 r.
      </p>

      <Section title="1. Administrator danych">
        <p>
          Administratorem Twoich danych osobowych jest właściciel serwisu{" "}
          <strong>egzaminmaklerski.online</strong>. W sprawach związanych z ochroną
          danych możesz się skontaktować za pomocą wiadomości e-mail podanej na
          stronie.
        </p>
      </Section>

      <Section title="2. Zakres i cel przetwarzania danych">
        <p>Przetwarzamy następujące dane:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>
            <strong>Dane konta Google</strong> (imię, adres e-mail, zdjęcie profilowe,
            identyfikator Google) – wyłącznie w celu uwierzytelnienia i identyfikacji
            użytkownika.
          </li>
          <li>
            <strong>Wyniki egzaminów</strong> (odpowiedzi na pytania, daty, tematy) –
            w celu generowania statystyk i spersonalizowanych rekomendacji nauki.
          </li>
          <li>
            <strong>Dane logowania</strong> (data i godzina logowania) – w celu
            zapewnienia bezpieczeństwa konta i celów statystycznych.
          </li>
          <li>
            <strong>Cookies analityczne (Google Analytics)</strong> – wyłącznie za
            Twoją zgodą, w celu analizy ruchu i poprawy serwisu.
          </li>
        </ul>
      </Section>

      <Section title="3. Podstawa prawna">
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Art. 6 ust. 1 lit. b RODO</strong> – przetwarzanie niezbędne do
            wykonania umowy (świadczenie usługi).
          </li>
          <li>
            <strong>Art. 6 ust. 1 lit. a RODO</strong> – zgoda użytkownika (cookies
            analityczne Google Analytics).
          </li>
          <li>
            <strong>Art. 6 ust. 1 lit. f RODO</strong> – uzasadniony interes
            administratora (bezpieczeństwo, zapobieganie nadużyciom).
          </li>
        </ul>
      </Section>

      <Section title="4. Okres przechowywania">
        <p>
          Dane przechowujemy do momentu usunięcia konta przez użytkownika lub przez
          okres wymagany przepisami prawa. Wyniki egzaminów są usuwane razem z kontem
          na żądanie.
        </p>
      </Section>

      <Section title="5. Pliki cookie i Google Analytics">
        <p>
          Serwis może używać plików cookie oraz narzędzia Google Analytics (Google
          LLC) do anonimowej analizy ruchu. Cookies analityczne są stosowane
          wyłącznie po udzieleniu przez Ciebie wyraźnej zgody.
        </p>
        <p>
          Google Analytics może przekazywać dane do USA. Google LLC przystąpiło do
          ram Data Privacy Framework, co stanowi odpowiednią gwarancję ochrony danych.
          Szczegóły: <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-indigo-600 dark:text-indigo-400"
          >
            polityka prywatności Google
          </a>.
        </p>
      </Section>

      <Section title="6. Twoje prawa (RODO)">
        <ul className="list-disc list-inside space-y-1">
          <li>Prawo dostępu do danych (art. 15 RODO)</li>
          <li>Prawo do sprostowania danych (art. 16 RODO)</li>
          <li>Prawo do usunięcia danych („prawo do bycia zapomnianym", art. 17 RODO)</li>
          <li>Prawo do przenoszenia danych (art. 20 RODO)</li>
          <li>Prawo do wniesienia sprzeciwu (art. 21 RODO)</li>
          <li>Prawo do cofnięcia zgody (art. 7 ust. 3 RODO)</li>
        </ul>
        <p className="mt-2">
          Możesz skorzystać z praw dotyczących danych bezpośrednio w{" "}
          <Link
            to="/profile"
            className="underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
          >
            ustawieniach swojego profilu
          </Link>{" "}
          (eksport lub usunięcie konta). Masz też prawo złożyć skargę do Prezesa
          Urzędu Ochrony Danych Osobowych (UODO).
        </p>
      </Section>

      <Section title="7. Zarządzanie zgodą na cookies">
        <p>Aktualna preferencja cookies:</p>
        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              consent === "accepted"
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                : consent === "rejected"
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                consent === "accepted"
                  ? "bg-green-500"
                  : consent === "rejected"
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`}
            />
            {consent === "accepted"
              ? "Cookies zaakceptowane"
              : consent === "rejected"
              ? "Cookies odrzucone"
              : "Brak decyzji"}
          </span>
          {consent !== "accepted" && (
            <button
              onClick={handleAccept}
              className="px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Zaakceptuj cookies
            </button>
          )}
          {consent === "accepted" && (
            <button
              onClick={handleReject}
              className="px-4 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Wycofaj zgodę
            </button>
          )}
        </div>
      </Section>
    </div>
  );
}
