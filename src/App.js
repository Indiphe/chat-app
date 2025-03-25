import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./Login";  // Ensure correct path
import { Register } from "./Register";  // Ensure correct path

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} /> {/* Default to Login */}
      </Routes>
    </Router>
  );
}

export default App;
