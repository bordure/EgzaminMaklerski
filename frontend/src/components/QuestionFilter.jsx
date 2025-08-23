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
        placeholder="Main Topic"
        value={mainTopic}
        onChange={e => setMainTopic(e.target.value)}
        className="border px-2 py-1 rounded w-full"
      />
      <input
        type="text"
        placeholder="Sub Topic (optional)"
        value={subTopic}
        onChange={e => setSubTopic(e.target.value)}
        className="border px-2 py-1 rounded w-full"
      />
      <input
        type="number"
        placeholder="Number of Questions"
        value={n}
        onChange={e => setN(Number(e.target.value))}
        className="border px-2 py-1 rounded w-full"
        min={1}
      />
      <button className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600">
        Fetch Questions
      </button>
    </form>
  );
}
