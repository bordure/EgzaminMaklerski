import React from "react";

export default function TopicsList({ topics, onSelect }) {
  return (
    <div className="space-y-2">
      {Object.entries(topics).map(([main, subtopics]) => (
        <div key={main}>
          <div className="font-bold text-gray-800 dark:text-gray-100">{main}</div>
          <div className="pl-4 space-x-2 mt-1">
            {subtopics.map((sub) => (
              <button
                key={sub}
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors duration-200"
                onClick={() => onSelect(main, sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
