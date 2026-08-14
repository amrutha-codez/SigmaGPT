import "./Sidebar.css";
import { useContext, useEffect, useState } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";
import { motion } from "framer-motion";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "./services/api.js";
import {
  FiPlus, FiTrash2, FiMessageSquare, FiBarChart2, FiBookOpen,
  FiCode, FiMic, FiBriefcase, FiFolder, FiAlertTriangle,
} from "react-icons/fi";

import logo from "./assets/blacklogo.png";
import hero from "./assets/hero.png";

const NAV_SECTIONS = [
  {
    label: "Learn",
    links: [
      { to: "/dashboard", label: "Dashboard", icon: FiBarChart2 },
      { to: "/study", label: "Study", icon: FiBookOpen },
      { to: "/mistakes", label: "Mistake Bank", icon: FiAlertTriangle },
    ],
  },
  {
    label: "Practice",
    links: [
      { to: "/coding-lab", label: "Coding Lab", icon: FiCode },
      { to: "/interview", label: "Interview", icon: FiMic },
    ],
  },
  {
    label: "Career",
    links: [
      { to: "/career", label: "Career Tools", icon: FiBriefcase },
      { to: "/projects", label: "Projects", icon: FiFolder },
    ],
  },
];

function Sidebar() {
  const {
    allThreads, setAllThreads, currThreadId, setNewChat,
    setPrompt, setReply, setCurrThreadId, setPrevChats,
  } = useContext(MyContext);

  const navigate = useNavigate();
  const location = useLocation();

  const [quickStats, setQuickStats] = useState(null);

  const getAllThreads = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("http://localhost:3000/api/thread", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await response.json();
      const filteredData = res.map((thread) => ({ threadId: thread.threadId, title: thread.title }));
      setAllThreads(filteredData);
    } catch (err) {
      console.log(err);
    }
  };

  const loadQuickStats = async () => {
    try {
      const res = await api.get("/dashboard");
      setQuickStats({ overallScore: res.data.overallScore, streak: res.data.streak });
    } catch (err) {
      // quiet failure — quick stats are a nice-to-have, not critical
    }
  };

  useEffect(() => {
    getAllThreads();
  }, [currThreadId]);

  useEffect(() => {
    loadQuickStats();
  }, [location.pathname]);

  const createNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
    navigate("/");
  };

  const changeThread = async (newThreadId) => {
    setCurrThreadId(newThreadId);
    navigate("/");

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`http://localhost:3000/api/thread/${newThreadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await response.json();
      setPrevChats(res);
      setNewChat(false);
      setReply(null);
    } catch (err) {
      console.log(err);
    }
  };

  const deleteThread = async (threadId) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`http://localhost:3000/api/thread/${threadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllThreads((prev) => prev.filter((thread) => thread.threadId !== threadId));
      if (threadId === currThreadId) createNewChat();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <section className="sidebar">
      <button className="new-chat-btn" onClick={createNewChat}>
        <img src={logo} alt="SigmaGPT" className="logo" />
        <span className="new-chat-text">New Chat</span>
        <FiPlus size={18} />
      </button>

      {quickStats && (
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="quick-stat-value">{quickStats.overallScore}%</span>
            <span className="quick-stat-label">Overall</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">🔥{quickStats.streak}</span>
            <span className="quick-stat-label">Streak</span>
          </div>
        </div>
      )}

      <nav className="main-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="nav-section">
            <p className="nav-section-label">{section.label}</p>
            {section.links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={`nav-link ${location.pathname === to ? "active" : ""}`}>
                <Icon className="thread-icon" /> <span>{label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <ul className="history">
        {allThreads?.map((thread, idx) => (
          <motion.li
            key={idx}
            onClick={() => changeThread(thread.threadId)}
            className={thread.threadId === currThreadId && location.pathname === "/" ? "highlighted" : ""}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="thread-title">
              <FiMessageSquare className="thread-icon" />
              <span>{thread.title}</span>
            </div>
            <FiTrash2
              className="delete-icon"
              onClick={(e) => {
                e.stopPropagation();
                deleteThread(thread.threadId);
              }}
            />
          </motion.li>
        ))}
      </ul>

      <div className="profile">
        <img src={hero} alt="Amrutha" className="avatar" />
        <div>
          <h4>Amrutha</h4>
          <p>Creator of SigmaGPT</p>
        </div>
      </div>
    </section>
  );
}

export default Sidebar;