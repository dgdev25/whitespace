import { Routes, Route, Navigate } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { FeedPage } from "./pages/FeedPage";
import { IdeaDetailPage } from "./pages/IdeaDetailPage";
import { BuildOutputPage } from "./pages/BuildOutputPage";
import { SavedPage } from "./pages/SavedPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/ideas/:id" element={<IdeaDetailPage />} />
        <Route path="/ideas/:id/build" element={<BuildOutputPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
