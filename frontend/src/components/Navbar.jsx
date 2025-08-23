import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between">
      <div className="font-bold text-lg">Exam System</div>
      <div className="space-x-6">
        <Link to="/generate" className="hover:text-blue-400">Generate Exam</Link>
        <Link to="/topics" className="hover:text-blue-400">Topics</Link>
      </div>
    </nav>
  );
}
