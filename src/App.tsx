import { Navigate, Route, Routes } from "react-router-dom";
import FeedPage from "./routes/FeedPage";
import ThreadPage from "./routes/ThreadPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/r/popular" replace />} />
      <Route path="/r/:sub" element={<FeedPage />} />
      <Route path="/r/:sub/:sort" element={<FeedPage />} />
      <Route path="/r/:sub/comments/:id" element={<ThreadPage />} />
      <Route path="/r/:sub/comments/:id/:slug" element={<ThreadPage />} />
      <Route path="*" element={<Navigate to="/r/popular" replace />} />
    </Routes>
  );
}
