"use client";

import React, { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2, Share, Copy, Check } from 'lucide-react';
import { ShareButton } from './ShareButton';
import DictionaryPanel from './DictionaryPanel';
import LoginModal from './LoginModal';
import UserList from './UserList';
import {FlowchartPanel} from './FlowchartPanel';
import AiChat from './AiChat';
import { useSocket } from "@/contexts/SocketContext";


// Programming terms dictionary
const programmingTerms: Record<string, { name: string; description: string; useCase: string; type?: string }> = {
  function: {
    name: "function",
    description: "A function is a block of code designed to perform a particular task. It is executed when it is called (invoked). Functions can take parameters and return values.",
    useCase: "// Function declaration\nfunction name(parameters) {\n  // code to be executed\n}",
    type: "Keyword"
  },
  def: {
    name: "def (Python function)",
    description: "In Python, 'def' is used to define a function. It creates a reusable block of code that can be called with specific arguments.",
    useCase: "# Python function\ndef function_name(parameters):\n    // code to be executed\n    return value",
    type: "Keyword"
  },
  console: {
    name: "console",
    description: "The console object provides access to the browser's debugging console. It contains methods like log(), error(), and warn().",
    useCase: '// Output to console\nconsole.log("Hello, World!");',
    type: "Object"
  },
  print: {
    name: "print",
    description: "The print() function outputs messages to the standard output device (screen) or other output stream.",
    useCase: '# Print in Python\nprint("Hello, World!")',
    type: "Function"
  },
  include: {
    name: "#include",
    description: "In C/C++, #include is a preprocessor directive that includes the contents of another file in the current source file.",
    useCase: "// Include standard input/output library\n#include <stdio.h>",
    type: "Preprocessor Directive"
  },
  import: {
    name: "import",
    description: "The import statement is used to include external modules or libraries in your code.",
    useCase: "# Import math module in Python\nimport math",
    type: "Keyword"
  },
  class: {
    name: "class",
    description: "A class is a blueprint for creating objects, providing initial values for state (member variables) and implementations of behavior (member functions or methods).",
    useCase: "// Class definition in Java\npublic class MyClass {\n    // class body\n}",
    type: "Keyword"
  },
  return: {
    name: "return",
    description: "The return statement ends function execution and specifies a value to be returned to the function caller.",
    useCase: "// Return a value from function\nreturn value;",
    type: "Keyword"
  },
  for: {
    name: "for loop",
    description: "A for loop repeats a block of code a specific number of times. It typically uses a counter variable to control the number of iterations.",
    useCase: "// For loop example\nfor (let i = 0; i < 5; i++) {\n    console.log(i);\n}",
    type: "Control Structure"
  },
  if: {
    name: "if statement",
    description: "The if statement executes a block of code if a specified condition is true.",
    useCase: "// If statement\nif (condition) {\n    // code to execute if condition is true\n}",
    type: "Control Structure"
  },
  const: {
    name: "const",
    description: "The const declaration creates a read-only reference to a value. It does not mean the value it holds is immutable, just that the variable identifier cannot be reassigned.",
    useCase: "// Constant declaration\nconst PI = 3.14159;",
    type: "Keyword"
  },
  let: {
    name: "let",
    description: "The let statement declares a block-scoped local variable, optionally initializing it to a value.",
    useCase: "// Let declaration\nlet counter = 0;",
    type: "Keyword"
  },
  var: {
    name: "var",
    description: "The var statement declares a function-scoped or globally-scoped variable, optionally initializing it to a value.",
    useCase: "// Var declaration\nvar message = 'Hello';",
    type: "Keyword"
  }
};

interface ExecutionResult {
  output: string;
  status: string;
  time: string;
  memory: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const defaultCode: { [key: string]: string } = {
  python: `# Welcome to CollabCode Canvas!
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print("Fibonacci sequence:")
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")`,

  javascript: `// Welcome to CollabCode Canvas!
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
    console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,

  cpp: `// Welcome to CollabCode Canvas!
#include <iostream>
using namespace std;

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    cout << "Fibonacci sequence:" << endl;
    for (int i = 0; i < 10; i++) {
        cout << "F(" << i << ") = " << fibonacci(i) << endl;
    }
    return 0;
}`,

  java: `// Welcome to CollabCode Canvas!
public class Main {
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }

    public static void main(String[] args) {
        System.out.println("Fibonacci sequence:");
        for (int i = 0; i < 10; i++) {
            System.out.println("F(" + i + ") = " + fibonacci(i));
        }
    }
}`,

  c: `// Welcome to CollabCode Canvas!
#include <stdio.h>

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    printf("Fibonacci sequence:\\n");
    for (int i = 0; i < 10; i++) {
        printf("F(%d) = %d\\n", i, fibonacci(i));
    }
    return 0;
}`
};

export const CodeEditor = ({
  isLoginModalOpen,
  onCreateRoom,
  onJoinRoom,
  username,
  roomId
}: {
  isLoginModalOpen: boolean;
  onCreateRoom: (username: string) => void;
  onJoinRoom: (username: string, roomId: string) => void;
  username: string;
  roomId: string;
}) => {
  const [code, setCode] = useState<string>(defaultCode.python);
  const [language, setLanguage] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [stdin, setStdin] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [isDictionaryVisible, setIsDictionaryVisible] = useState(true);
  const [isFlowchartVisible, setIsFlowchartVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const { socket, isConnected, users = [], roomId: socketRoomId, createRoom, joinRoom } = useSocket();
  const hasJoinedRoom = useRef(false);
  const hoverProviderRegistered = useRef(false);


  useEffect(() => {
    if (socket && username && roomId && !hasJoinedRoom.current) {
      joinRoom(username, roomId);
      hasJoinedRoom.current = true;
    }
  }, [socket, username, roomId]);

  useEffect(() => {
    if (!socket) return;

    // Listen for room join confirmation with initial state
    socket.on("room-joined", ({ roomId, users, code, language, output, whiteboard, flowchart}: any) => {
      console.log("Room joined with state:", { code, language, output });
      if (code) setCode(code);
      if (language) setLanguage(language);
      if (output) setResult(output);
      if (flowchart) {
        socket.emit('flowchart-data-received', flowchart);
      }
    });

    // Listen for code changes from other users
    socket.on("code-change", ({ code, userId }: any) => {
      if (userId !== socket.id) {
        setCode(code);
      }
    });

    // Listen for language changes from other users
    socket.on("language-change", ({ language, code, userId }: any) => {
      if (userId !== socket.id) {
        setLanguage(language);
        setCode(code);
      }
    });

    // Listen for output changes from other users - REMOVED USER CHECK
    socket.on("output-change", ({ result }: any) => {
      setResult(result);
    });

    // Cleanup
    return () => {
      socket.off("room-joined");
      socket.off("code-change");
      socket.off("language-change");
      socket.off("output-change");
    };
  }, [socket]);

  // Handle code changes and broadcast to other users
  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    
    if (socket && roomId) {
      socket.emit('code-change', {
        code: newCode,
        userId: socket.id,
        roomId: roomId
      });
    }
  };

  // Handle language changes and broadcast to other users
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    const newCode = defaultCode[newLanguage] || `// Write your ${newLanguage} code here`;
    setCode(newCode);
    setResult(null);
    setActiveTerm(null);
    setHoverInfo(null);
    
    if (socket && roomId) {
      socket.emit('language-change', {
        language: newLanguage,
        code: newCode,
        userId: socket.id,
        roomId: roomId
      });
    }
  };

  // Handle running code and broadcast output
  const handleRunCode = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          stdin
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

      // Broadcast output to all users in the room
      if (socket && roomId) {
        socket.emit('output-change', {
          result: data,
          userId: socket.id,
          roomId: roomId
        });
      }
    } catch (error) {
      const errorResult = {
        output: `Connection error: ${error}`,
        status: 'Error',
        time: '0.00s',
        memory: '0KB'
      };
      
      setResult(errorResult);
      
      // Broadcast error output to all users
      if (socket && roomId) {
        socket.emit('output-change', {
          result: errorResult,
          userId: socket.id,
          roomId: roomId
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Copy room link to clipboard
  const copyRoomLink = async () => {
    if (roomId) {
      const roomLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      
      try {
        await navigator.clipboard.writeText(roomLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = roomLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const toggleDictionaryVisibility = () => {
    setIsDictionaryVisible(!isDictionaryVisible);
  };

  const toggleFlowchartVisibility = () => {
    setIsFlowchartVisible(!isFlowchartVisible);
  };

  // Configure Monaco Editor for hover functionality
  const handleEditorDidMount = (editor: any, monaco: any) => {
  editorRef.current = editor;
  monacoRef.current = monaco;

  if (!hoverProviderRegistered.current) {
    setupHoverProvider(monaco);
    hoverProviderRegistered.current = true;
  }
};

  const setupHoverProvider = (monaco: any) => {
    if (!monaco.languages.registerHoverProvider) return;

    const languages = ['python', 'javascript', 'typescript', 'cpp', 'java', 'c'];
    
    languages.forEach(lang => {
      monaco.languages.registerHoverProvider(lang, {
        provideHover: (model: any, position: any) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const lineContent = model.getLineContent(position.lineNumber);
          const wordText = word.word;
          
          if (programmingTerms[wordText]) {
            setActiveTerm(wordText);
            setHoverInfo(null);
            return {
              range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              ),
              contents: [
                { value: `**${programmingTerms[wordText].name}**` },
                { value: `*Type: ${programmingTerms[wordText].type}*` },
                { value: programmingTerms[wordText].description },
                { value: '```' + lang + '\n' + programmingTerms[wordText].useCase + '\n```' }
              ]
            };
          }
          
          const variableInfo = analyzeIdentifier(wordText, lineContent, position, lang);
          if (variableInfo) {
            setHoverInfo(variableInfo);
            setActiveTerm(null);
            return {
              range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              ),
              contents: [
                { value: `**${variableInfo.name}**` },
                { value: `*Type: ${variableInfo.type}*` },
                { value: variableInfo.description }
              ]
            };
          }
          
          const genericInfo = getGenericIdentifierInfo(wordText, lineContent, lang);
          setHoverInfo(genericInfo);
          setActiveTerm(null);
          return {
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: [
              { value: `**${genericInfo.name}**` },
              { value: `*Type: ${genericInfo.type}*` },
              { value: genericInfo.description }
            ]
          };
        }
      });
    });
  };

  const analyzeIdentifier = (identifier: string, lineContent: string, position: any, lang: string) => {
    const line = lineContent.toLowerCase();
    
    if (line.includes(identifier + '(') || line.includes(identifier + ' (')) {
      return {
        name: identifier,
        type: "Function/Method",
        description: `This appears to be a function or method call. In ${lang}, functions are reusable blocks of code that perform specific tasks.`
      };
    }
    
    const declarationPatterns = {
      javascript: /(var|let|const)\s+/,
      python: /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=/,
      java: /(int|float|double|String|boolean|char)\s+/,
      cpp: /(int|float|double|char|bool)\s+/,
      c: /(int|float|double|char)\s+/
    };
    
    if (declarationPatterns[lang as keyof typeof declarationPatterns] && 
        declarationPatterns[lang as keyof typeof declarationPatterns].test(line)) {
      return {
        name: identifier,
        type: "Variable",
        description: `This appears to be a variable. Variables are used to store data values in ${lang}.`
      };
    }
    
    return null;
  };

  const getGenericIdentifierInfo = (identifier: string, lineContent: string, lang: string) => {
    return {
      name: identifier,
      type: "Identifier",
      description: `This is an identifier in your ${lang} code. Identifiers are names given to variables, functions, classes, etc.`
    };
  };

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onJoinRoom={onJoinRoom}
        onCreateRoom={onCreateRoom}
        initialRoomId={roomId}
      />
      
      
      
      <div className="p-3 bg-gray-700 flex items-center gap-3 flex-wrap">
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="c">C</option>
        </select>

        <button
          onClick={handleRunCode}
          disabled={isRunning}
          className="px-3 py-1 bg-green-600 text-white rounded text-sm flex items-center gap-1 disabled:bg-gray-600"
        >
          {isRunning ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
          Run
        </button>
        
        <ShareButton 
          code={code} 
          language={language} 
          roomId={roomId}
          onShare={(url) => setShareUrl(url)}
        />

        <button
          onClick={toggleFlowchartVisibility}
          className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
            isFlowchartVisible 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
          title="Toggle Code Flowchart"
        >
          📊 Flowchart
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-300">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <span className="text-sm text-gray-300">
          Language: {language.toUpperCase()}
        </span>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                hover: {
                  enabled: true,
                  delay: 100,
                  sticky: true
                }
              }}
            />
          </div>

          <DictionaryPanel 
            activeTerm={activeTerm} 
            definitions={programmingTerms} 
            hoverInfo={hoverInfo}
            isVisible={isDictionaryVisible}
            onToggle={toggleDictionaryVisibility}
          />

          <FlowchartPanel
            code={code}
            language={language}
            isVisible={isFlowchartVisible}
            onToggle={toggleFlowchartVisibility}
          />

          <div className="h-48 border-t border-gray-600">
            <div className="p-2 bg-gray-700 border-b border-gray-600 flex items-center justify-between">
              <span className="text-sm font-medium">Output</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Input:</span>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder={"stdin (each input on new line)\nExample:\n5\n7"}
                  className="px-2 py-1 bg-gray-600 text-white rounded text-xs w-40 h-12 resize-none"
                />
              </div>
            </div>
            <div className="p-3 bg-gray-800 h-40 overflow-auto">
              <pre className="text-green-400 text-sm whitespace-pre-wrap font-mono">
                {result?.output || 'Click "Run" to see output...'}
              </pre>
              {result && (
                <div className="mt-2 text-xs text-gray-400 flex gap-3">
                  <span>Status: {result.status}</span>
                  <span>Time: {result.time}</span>
                  <span>Memory: {result.memory}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <AiChat getCode={() => editorRef.current?.getValue() || ""} />
    </div>
  );
};

export default CodeEditor;