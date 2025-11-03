import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import InterviewGenerator from "./InterviewGenerator";
import InterviewPage from "./InterviewPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<InterviewGenerator />} />
        <Route path="/interview" element={<InterviewPage />} />
      </Routes>
    </Router>
  );
}

export default App;
