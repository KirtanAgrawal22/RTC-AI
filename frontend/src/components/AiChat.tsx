'use client';

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
export default function AiChat({ getCode }: { getCode: () => string }) {

  const [open,setOpen] = useState(false);
  const [input,setInput] = useState("");
  const [messages,setMessages] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);

  const send = async () => {

    const code = getCode();

    const userMsg = { role:"user", text:input };

    setMessages(m => [...m,userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/ai",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        prompt:input,
        code
      })
    });

    const data = await res.json();

    setMessages(m => [...m,{ role:"ai", text:data.text }]);
    setLoading(false);
  };

  if(!open){
    return (
      <button
        onClick={()=>setOpen(true)}
        className="fixed bottom-6 right-6 z-[49] w-14 h-14 flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full shadow-lg hover:scale-110 transition"
      >
        🤖
      </button>
    );
  }

  return (

    <div className="fixed bottom-6 right-6 w-[420px] h-[450px] bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col z-[9999] shadow-2xl">

      <div className="p-3 border-b border-zinc-800 flex justify-between text-white">
        <div>AI Assistant</div>
        <button onClick={()=>setOpen(false)}>✖</button>
      </div>

      <div className="flex-1 overflow-auto p-3 text-sm text-white space-y-3">

        {messages.map((m,i)=>(
  <div key={i} className={m.role==="user"?"text-blue-400":"text-green-400"}>

    {m.role === "ai" ? (

      <ReactMarkdown
        components={{
          code({ inline, className, children, ...props }: any) {

            const match = /language-(\w+)/.exec(className || "");

            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-zinc-800 px-1 rounded">{children}</code>
            );
          },
        }}
      >
        {m.text}
      </ReactMarkdown>

    ) : (
      m.text
    )}

  </div>
))}

        {loading && <div className="text-zinc-500">AI thinking...</div>}

      </div>

      <div className="p-3 border-t border-zinc-800 flex gap-2">

        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          className="flex-1 bg-zinc-900 text-white p-2 rounded"
          placeholder="Ask about the code..."
        />

        <button
          onClick={send}
          className="bg-purple-600 px-4 py-2 rounded text-white"
        >
          Send
        </button>

      </div>

    </div>
  );
}