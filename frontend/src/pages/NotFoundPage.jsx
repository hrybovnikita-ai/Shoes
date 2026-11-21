import { useNavigate } from "react-router-dom";
import useDocumentMeta from "../hooks/useDocumentMeta";

export default function NotFoundPage() {
  const navigate = useNavigate();
  useDocumentMeta({ title: "Page not found", noindex: true });
  return (
    <main className="container empty-state not-found" id="main-content">
      <div className="empty-icon" aria-hidden="true">
        404
      </div>
      <h1>This page took a wrong step.</h1>
      <p className="muted">The page you are looking for does not exist.</p>
      <button type="button" className="primary" onClick={() => navigate("/shop")}>
        Back to Shop →
      </button>
    </main>
  );
}
