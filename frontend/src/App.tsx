import { Routes, Route, Navigate } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { FeedPage } from "./pages/FeedPage";
import { IdeaDetailPage } from "./pages/IdeaDetailPage";
import { BuildOutputPage } from "./pages/BuildOutputPage";
import { SavedPage } from "./pages/SavedPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { NewProjectPage } from "./pages/NewProjectPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/ideas/:id" element={<IdeaDetailPage />} />
        <Route path="/ideas/:id/build" element={<Navigate to="overview" replace />} />
        <Route path="/ideas/:id/build/:tab" element={<BuildOutputPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<NewProjectPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/settings" element={<Navigate to="/settings/runner" replace />} />
        <Route path="/settings/:tab" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
