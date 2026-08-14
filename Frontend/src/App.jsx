import "./App.css";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from "./MyContext.jsx";
import { useState } from "react";
import { v1 as uuidv1 } from "uuid";

import { Routes, Route, Outlet } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./Dashboard/Dashboard.jsx";
import Study from "./Study/Study.jsx";
import CodingLab from "./CodingLab/CodingLab.jsx";
import Interview from "./Interview/Interview.jsx";
import Career from "./Career/Career.jsx";
import Projects from "./Projects/Projects.jsx";
import MistakeBank from "./MistakeBank/MistakeBank.jsx";
function AppLayout() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]);
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);

  const providerValues = {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setCurrThreadId,
    newChat,
    setNewChat,
    prevChats,
    setPrevChats,
    allThreads,
    setAllThreads,
  };

  return (
    <div className="app">
      <MyContext.Provider value={providerValues}>
        <Sidebar />
        <Outlet />
      </MyContext.Provider>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="coding-lab" element={<CodingLab />} />
      <Route path="interview" element={<Interview />} />
      <Route path="career" element={<Career />} />
      <Route path="projects" element={<Projects />} />
      <Route path="mistakes" element={<MistakeBank />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ChatWindow />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="study" element={<Study />} />
      </Route>
    </Routes>
  );
}

export default App;