import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import GenerateExamPage from "./pages/GenerateExamPage";
import TopicsPage from "./pages/TopicsPage";

export default function App() {
  return (
    <Router>
      <Navbar/>
      <Routes>
        <Route path="/" element={<Navigate to="/generate" replace/>}/>
        <Route path="/generate" element={<GenerateExamPage/>}/>
        <Route path="/topics" element={<TopicsPage/>}/>
      </Routes>
    </Router>
  );
}
