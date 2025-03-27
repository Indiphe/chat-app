import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./Login";
import { Register } from "./Register";
import { Chat } from "./Chat";  // Import Chat component
import "./App.css"; // Ensure this is included

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />  {/* Route to Chat */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;

