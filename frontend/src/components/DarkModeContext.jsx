import { createContext, useContext, useState, useEffect } from "react";
const DarkModeContext = createContext();
export const DarkModeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true" || false;
  });
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem("darkMode", newMode);
      console.log("selectedColorMode:", newMode ? "Dark" : "Light");
      return newMode;
    });
  };
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);
  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};
export const useDarkMode = () => useContext(DarkModeContext);
