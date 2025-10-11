import React from "react";
import { useDarkMode } from "../components/DarkModeContext";

export default function MainPage() {
  const { isDarkMode } = useDarkMode();

  const course = {
    title: "Egzamin Maklerski",
    duration: "180 minut",
    totalQuestions: 120,
    sections: [
      {
        name: "Analiza Portfelowa",
        topics: [
          { name: "Wskaźniki efektywności zarządzania portfelem", avg: 1 },
          { name: "Kontrybucja do stopy zwrotu", avg: 1.5 },
          { name: "Modele rynku (CML, Sharp, CAPM)", avg: 2 },
          { name: "Strategie zarządzania portfelami", avg: 2.5 },
          { name: "Średni ważony koszt kapitału", avg: 2 },
        ],
      },
      {
        name: "Analiza wskaźnikowa i wycena",
        topics: [
          { name: "Dźwignie", avg: 1.5 },
          { name: "Wskaźniki aktywności", avg: 1.5 },
          { name: "Metody wyceny przedsiębiorstw", avg: 2 },
          { name: "Wskaźniki rentowności", avg: 2.5 },
          { name: "Model Gordona", avg: 2 },
        ],
      },
      {
        name: "Etyka",
        topics: [{ name: "Zasady etyki zawodowej Maklerów i Doradców", avg: 2 }],
      },
      {
        name: "Instrumenty Dłużne",
        topics: [
          { name: "Obligacje zerokuponowe", avg: 1 },
          { name: "Rodzaje obligacji i ich ryzyka", avg: 1 },
          { name: "Wypukłość obligacji (convexity)", avg: 1 },
          { name: "Metoda równych rat kapitałowych", avg: 1 },
          { name: "Duration", avg: 1 },
          { name: "Metoda równych kwot płatności kredytu", avg: 1 },
          { name: "Stopy zwrotu z obligacji", avg: 0.5 },
          { name: "Zarządzanie portfelem obligacji", avg: 1 },
          { name: "Krzywa rentowności", avg: 1 },
        ],
      },
      {
        name: "Instrumenty Pochodne",
        topics: [
          { name: "Kontrakty terminowe", avg: 1 },
          { name: "Strategie opcyjne - wykorzystanie strategii", avg: 1 },
          { name: "Strategie opcyjne - budowa strategii", avg: 2 },
          { name: "Strategie opcyjne - łączenie strategii", avg: 1 },
          { name: "Opcje realne", avg: 1 },
          { name: "Współczynniki greckie", avg: 2 },
          { name: "Modele wyceny opcji", avg: 1 },
        ],
      },
      {
        name: "Matematyka Finansowa",
        topics: [
          { name: "Metody oceny projektów inwestycyjnych", avg: 1.5 },
          { name: "Stopa zwrotu z inwestycji", avg: 2 },
          { name: "Wartość bieżąca renty wieczystej", avg: 1 },
          { name: "NPV i PI", avg: 1 },
          { name: "Wartość bieżąca renty", avg: 2 },
          { name: "Stopa IRR i MIRR", avg: 1 },
          { name: "Wartość bieżąca", avg: 1 },
          { name: "Wartość przyszła renty", avg: 3.5 },
        ],
      },
      {
        name: "Prawo (Rozporządzenia)",
        topics: [
          { name: "w sprawie wymogów organizacyjnych (Nr 2017/565)", avg: 2 },
          { name: "w sprawie szczegółowych warunków technicznych i organizacyjnych dla firm inwestycyjnych", avg: 4.5 },
          { name: "w sprawie nadużyć na rynku (Nr 596/2014)", avg: 2.5 },
          { name: "w sprawie trybu i warunków postępowania firm inwestycyjnych i banków", avg: 2.5 },
        ],
      },
      {
        name: "Prawo (Ustawy)",
        topics: [
          { name: "Ustawa o nadzorze nad rynkiem finansowym", avg: 3 },
          { name: "Ustawa o obrocie (art. 1 do 45)", avg: 6 },
          { name: "Ustawa o rachunkowości - Łączenie spółek", avg: 3 },
          { name: "Ustawa o ofercie publicznej", avg: 3 },
          { name: "Ustawa o obligacjach", avg: 4 },
          { name: "Kodeks Cywilny", avg: 3 },
          { name: "Ustawa o rachunkowości - Definicje", avg: 7 },
          { name: "Ustawa o obrocie (art. 69+) - Firmy inwestycyjne", avg: 4 },
          { name: "Kodeks Spółek Handlowych", avg: 4 },
          { name: "Ustawa o obrocie (art. 45a do 68)", avg: 0.5 },
          { name: "Ustawa o funduszach inwestycyjnych", avg: 4 },
        ],
      },
      {
        name: "Techniki Notowań Giełdowych",
        topics: [
          { name: "Regulamin GPW", avg: 16.5 },
          { name: "SZOG", avg: 8.5 },
        ],
      },
    ],
  };

  const mathSections = course.sections.filter(
    (s) => !s.name.includes("Prawo") && !s.name.includes("Etyka")
  );
  const lawSections = course.sections.filter(
    (s) => s.name.includes("Prawo") || s.name.includes("Etyka")
  );

  const tableClass = "w-full table-fixed border-collapse";
  const thClass = "p-2 text-center font-semibold border-b";
  const tdClass = "p-2 text-center truncate";

  return (
    <div className={`min-h-screen p-8 ${isDarkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 border-b pb-4">{course.title}</h1>

        <div className="mb-6 space-y-1">
          <p className="text-lg"><strong>Czas trwania:</strong> {course.duration}</p>
          <p className="text-lg"><strong>Liczba pytań:</strong> {course.totalQuestions}</p>
        </div>

        {/* --- Part I: Matematyka Finansowa --- */}
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Część I – Matematyka Finansowa</h2>
        {mathSections.map((section, idx) => (
          <div key={idx} className={`mb-8 rounded-lg shadow-lg ${isDarkMode ? "bg-gray-800" : "bg-white"} p-6`}>
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">{section.name}</h3>
        <table className={tableClass}>
          <colgroup>
            <col className="w-[75%]" />
            <col className="w-[25%]" />
          </colgroup>
          <thead>
            <tr className={`${isDarkMode ? "bg-gray-700" : "bg-blue-50"}`}>
              <th className="p-2 text-left font-semibold border-b">Temat</th>
              <th className="p-2 text-center font-semibold border-b">Średnia liczba pytań</th>
            </tr>
          </thead>
          <tbody>
            {section.topics.map((topic, i) => (
              <tr
                key={i}
                className={`${
                  i % 2 === 0
                    ? isDarkMode ? "bg-gray-800" : "bg-white"
                    : isDarkMode ? "bg-gray-700" : "bg-gray-50"
                }`}
              >
                <td className="p-2 text-left truncate">{topic.name}</td>
                <td className="p-2 text-center">{Math.round(topic.avg)}</td>
              </tr>
            ))}
          </tbody>
        </table>

          </div>
        ))}

        {/* --- Part II: Prawo --- */}
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Część II – Prawo</h2>
        {lawSections.map((section, idx) => (
          <div key={idx} className={`mb-8 rounded-lg shadow-lg ${isDarkMode ? "bg-gray-800" : "bg-white"} p-6`}>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">{section.name}</h3>
          <table className={tableClass}>
            <colgroup>
              <col className="w-[75%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className={`${isDarkMode ? "bg-gray-700" : "bg-blue-50"}`}>
                <th className="p-2 text-left font-semibold border-b">Temat</th>
                <th className="p-2 text-center font-semibold border-b">Średnia liczba pytań</th>
              </tr>
            </thead>
            <tbody>
              {section.topics.map((topic, i) => (
                <tr
                  key={i}
                  className={`${
                    i % 2 === 0
                      ? isDarkMode ? "bg-gray-800" : "bg-white"
                      : isDarkMode ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <td className="p-2 text-left truncate">{topic.name}</td>
                  <td className="p-2 text-center">{Math.round(topic.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          </div>
        ))}
      </div>
    </div>
  );
}
