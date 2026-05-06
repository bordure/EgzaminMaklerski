import React, { useState } from "react";
export default function QuestionFilter({ onFetch }) {
  const [mainTopic, setMainTopic] = useState("");
  const [subTopic, setSubTopic] = useState("");
  const [n, setN] = useState(5);
  const handleSubmit = e => {
    e.preventDefault();
    if (!mainTopic) return;
    onFetch(mainTopic, subTopic || null, n);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        placeholder="Główny temat"
        value={mainTopic}
        onChange={e => setMainTopic(e.target.value)}
        className="border px-2 py-1 rounded w-full"
      />
      <input
        type="text"
        placeholder="Podtemat (opcjonalnie)"
        value={subTopic}
        onChange={e => setSubTopic(e.target.value)}
        className="border px-2 py-1 rounded w-full"
      />
      <input
        type="number"
        placeholder="Liczba pytań"
        value={n}
        onChange={e => setN(Number(e.target.value))}
        className="border px-2 py-1 rounded w-full"
        min={1}
      />
      <button className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600">
        Pobierz pytania
      </button>
    </form>
  );
}
