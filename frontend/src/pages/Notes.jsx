import React, { useEffect, useState, useCallback, Component } from "react";
import { NotionRenderer } from "react-notion-x";
import { Code } from "react-notion-x/build/third-party/code";
import { Equation } from "react-notion-x/build/third-party/equation";
import { useParams } from "react-router-dom";
import { fetchNotionPage } from "../api";
import { useDarkMode } from "../components/DarkModeContext";
import "react-notion-x/src/styles.css";
import "prismjs/themes/prism-tomorrow.css";
import "katex/dist/katex.min.css";
class NotionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-red-500 dark:text-red-400">
          Nie udało się wyrenderować strony Notion. Spróbuj odświeżyć.
        </div>
      );
    }
    return this.props.children;
  }
}
function sanitizeRecordMap(recordMap) {
  if (!recordMap) return recordMap;
  const block = {};
  for (const [key, val] of Object.entries(recordMap.block || {})) {
    if (!key || typeof key !== "string" || !val?.value) continue;
    if (typeof val.value.id !== "string") {
      val.value.id = key;
    }
    block[key] = val;
  }
  return { ...recordMap, block };
}
const Notes = () => {
  const { isDarkMode } = useDarkMode();
  const { id } = useParams();
  const pageId = id || "248cf5e9d029808eb124f2913f1dc259";
  const [recordMap, setRecordMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPageId, setCurrentPageId] = useState(pageId);
  const processNotionData = useCallback((data) => {
    let raw;
    if (data?.recordMap?.block) {
      raw = data.recordMap;
    } else if (data?.block) {
      raw = {
        block: data.block,
        notion_user: data.notion_user || {},
        collection: data.collection || {},
        collection_view: data.collection_view || {},
        space: data.space || {},
        user: data.user || {},
      };
    } else {
      const blocks = {};
      Object.keys(data || {}).forEach((key) => {
        const entry = data[key];
        if (!entry || typeof entry !== "object") return;
        if (entry.value?.value) {
          blocks[key] = entry.value;
        } else if (entry.value) {
          blocks[key] = entry;
        }
      });
      raw = {
        block: blocks,
        notion_user: {},
        collection: {},
        collection_view: {},
        space: {},
        user: {},
      };
    }
    return sanitizeRecordMap(raw);
  }, []);
  const handlePageClick = useCallback(
    async (clickedPageId) => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchNotionPage(clickedPageId);
        setRecordMap(processNotionData(data));
        setCurrentPageId(clickedPageId);
      } catch (err) {
        setError(err.message || "Nie udało się załadować strony");
      } finally {
        setLoading(false);
      }
    },
    [processNotionData]
  );
  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchNotionPage(currentPageId);
        setRecordMap(processNotionData(data));
      } catch (err) {
        setError(err.message || "Nie udało się załadować strony");
      } finally {
        setLoading(false);
      }
    };
    loadPage();
  }, [currentPageId, processNotionData]);
  useEffect(() => {
    const handleClick = (e) => {
      const link = e.target.closest("a");
      if (link?.href) {
        try {
          const url = new URL(link.href);
          if (url.pathname.startsWith("/notes/")) {
            e.preventDefault();
            e.stopPropagation();
            handlePageClick(url.pathname.split("/notes/")[1]);
          }
        } catch {}
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [handlePageClick]);
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Ładowanie strony Notion...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Nie udało się załadować strony
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }
  if (!recordMap || !recordMap.block || Object.keys(recordMap.block).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Pusta strona
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Strona Notion nie zawiera żadnych bloków treści.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            Odśwież
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900`}>
      <div className="notion-frame max-w-7xl mx-auto py-8 px-8">
        <NotionErrorBoundary>
          <NotionRenderer
            recordMap={recordMap}
            fullPage={false}
            darkMode={isDarkMode}
            rootPageId={currentPageId}
            previewImages={true}
            showCollectionViewDropdown={false}
            mapPageUrl={(pageId) => (pageId ? `/notes/${pageId.replaceAll('-', '')}` : '/notes')}
            mapImageUrl={(url, block) => {
              if (!url) return "";
              if (url.includes("img.notionusercontent.com")) return url;
              try {
                const u = new URL(url);
                if (u.searchParams.has("exp") && u.searchParams.has("sig")) {
                  return `https://img.notionusercontent.com${u.pathname}?${u.searchParams.toString()}`;
                }
              } catch {}
              return `https://www.notion.so/image/${encodeURIComponent(
                url
              )}?table=block&id=${block?.id}&cache=v2`;
            }}
            components={{ Code, Equation }}
            disableHeader={false}
          />
        </NotionErrorBoundary>
      </div>
    </div>
  );
};
export default Notes;
