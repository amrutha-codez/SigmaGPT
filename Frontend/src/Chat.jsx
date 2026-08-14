import "./Chat.css";
import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

function Chat({ getReply }) {
    const {
     newChat,
     prevChats,
     reply,
     setPrompt,
    } = useContext(MyContext);
    const [latestReply, setLatestReply] = useState(null);

    useEffect(() => {
        if(reply === null) {
            setLatestReply(null); 
            return;
        }

        if(!prevChats?.length) return;

        const content = reply.split(" "); //individual words

        let idx = 0;
        const interval = setInterval(() => {
            setLatestReply(content.slice(0, idx+1).join(" "));

            idx++;
            if(idx >= content.length) clearInterval(interval);
        }, 40);

        return () => clearInterval(interval);

    }, [prevChats, reply])

    const handleSuggestion = (text) => {
      setPrompt(text);
      getReply(text);
   };

   return (
    <>
      {newChat && (
       <div className="welcomeScreen">
         <h1>👋 Welcome to SigmaGPT</h1>

         <p>How can I help you today?</p>

        <div className="suggestions">

  <div
    className="card"
    onClick={() =>
      handleSuggestion("Explain React Hooks in detail with examples.")
    }
  >
    💻 Explain React Hooks
  </div>

  <div
    className="card"
    onClick={() =>
      handleSuggestion("Write a Java program with explanation.")
    }
  >
    ☕ Write Java Code
  </div>

  <div
    className="card"
    onClick={() =>
      handleSuggestion("Help me build a responsive portfolio website using React.")
    }
  >
    🚀 Build a Portfolio Website
  </div>

  <div
    className="card"
    onClick={() =>
      handleSuggestion("Explain Artificial Intelligence concepts from beginner to advanced.")
    }
  >
    🤖 Explain AI Concepts
  </div>

</div> 
      </div>
    )}

    <div className="chats">

      {prevChats?.slice(0, -1).map((chat, idx) => (

        <div
          className={
            chat.role === "user"
              ? "userDiv"
              : "gptDiv"
          }
          key={idx}
        >

         <div className="messageHeader">

            <div className="avatarSmall">
              {chat.role === "user" ? "👤" : "🤖"}
            </div>

            <span>
              {chat.role === "user"
                ? "You"
                : "SigmaGPT"}
            </span>

         </div>

         {chat.role === "user" ? (
            <p className="userMessage">
              {chat.content}
            </p>
          ) : (
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
            >
              {chat.content}
            </ReactMarkdown>
          )}

        </div>
      ))}

      {prevChats.length > 0 && (
        <>
          {latestReply === null ? (
            <div className="gptDiv">

              <div className="messageHeader">
                <div className="avatarSmall">
                  🤖
                </div>

                <span>SigmaGPT</span>
              </div>

              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
              >
                {
                  prevChats[
                    prevChats.length - 1
                  ].content
                }
              </ReactMarkdown>

            </div>
          ) : (
            <div className="gptDiv">

              <div className="messageHeader">
                <div className="avatarSmall">
                  🤖
                </div>

                <span>SigmaGPT</span>
              </div>

              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
              >
                {latestReply}
              </ReactMarkdown>

            </div>
          )}
        </>
      )}
    </div>
  </>
);
}


export default Chat;