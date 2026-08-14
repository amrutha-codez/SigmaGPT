import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect } from "react";
import { ScaleLoader } from "react-spinners";
import {
  FiSend,
} from "react-icons/fi";

function ChatWindow() {
  const {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setPrevChats,
    setNewChat,
  } = useContext(MyContext);

  const [loading, setLoading] = useState(false);

  const getReply = async (message = prompt) => {
    if (!message.trim()) return;

    setLoading(true);
    setNewChat(false);

    const token = localStorage.getItem("token");

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            message,
            threadId: currThreadId,
        }),
    };


    try {
      const response = await fetch(
        "http://localhost:3000/api/chat",
        options
      );

      const res = await response.json();

      console.log("Status:", response.status);
      console.log("Response:", res);

      if (!response.ok) {
        alert(res.error || res.message);
        setLoading(false);
        return;
      }

      setReply(res.reply);
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (prompt && reply) {
      setPrevChats((prevChats) => [
        ...prevChats,
        {
          role: "user",
          content: prompt,
        },
        {
          role: "assistant",
          content: reply,
        },
      ]);
    }

    setPrompt("");
  }, [reply]);


  return (
    <div className="chatWindow">

      {/* Navbar */}
      <div className="navbar">
      </div>

      {/* Dropdown */}

      

      <Chat getReply={getReply} />

      <div className="loader">
        <ScaleLoader
          color="#3b82f6"
          loading={loading}
          height={20}
        />
      </div>

      {/* Input */}

      <div className="chatInput">

        <div className="inputBox">

          <input
            placeholder="Message SigmaGPT..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" ? getReply() : null
            }
          />

          

          <div
            id="submit"
            onClick={getReply}
          >
            <FiSend />
          </div>

        </div>

        <p className="info">
          SigmaGPT may generate inaccurate information. Please verify important details.
        </p>

      </div>

    </div>
  );
}

export default ChatWindow;