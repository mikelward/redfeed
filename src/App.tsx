import { Navigate, Route, Routes } from "react-router-dom";
import FeedPage from "./routes/FeedPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/r/popular" replace />} />
      <Route path="/r/:sub" element={<FeedPage />} />
      <Route path="/r/:sub/:sort" element={<FeedPage />} />
      <Route path="*" element={<Navigate to="/r/popular" replace />} />
    </Routes>
  );
}
