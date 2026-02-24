/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Code2, 
  MessageSquare, 
  Play, 
  Settings, 
  Plus, 
  Send, 
  ChevronRight, 
  Copy, 
  Check,
  Layout,
  Sparkles,
  Terminal,
  History,
  Moon,
  Sun,
  Files,
  FolderTree,
  Maximize2,
  Minimize2,
  Search,
  FileCode,
  FileJson,
  FileText,
  Terminal as TerminalIcon,
  PlayCircle,
  Bug,
  Database,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Cpu,
  AlertTriangle,
  ArrowRight,
  Cloud,
  Zap,
  LogIn,
  LogOut,
  Activity,
  Fingerprint,
  ShieldAlert,
  Globe,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import Markdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Editor from '@monaco-editor/react';
import { generateAIContent, generateSpeech, type AIConfig } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { io, Socket } from 'socket.io-client';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FileData {
  id: string;
  name: string;
  content: string;
  language: string;
}

function SecurityToggle({ label, desc, active, onClick }: { label: string, desc: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-6 rounded-[2rem] border transition-all text-left space-y-4 group relative overflow-hidden backdrop-blur-xl",
        active 
          ? "bg-m3-primary/10 border-m3-primary/40 shadow-xl shadow-m3-primary/10" 
          : "bg-white/5 border-white/10 hover:bg-white/10"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-m3-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center justify-between relative z-10">
        <h5 className={cn("font-black text-xs uppercase tracking-[0.1em] transition-colors", active ? "text-m3-primary" : "text-m3-on-surface")}>{label}</h5>
        <div className={cn(
          "w-12 h-6 rounded-full relative transition-all duration-500 shadow-inner",
          active ? "bg-m3-primary shadow-[0_0_15px_rgba(103,80,164,0.4)]" : "bg-m3-outline/20"
        )}>
          <motion.div 
            animate={{ 
              x: active ? 26 : 4,
              scale: active ? 1.1 : 1
            }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
          />
        </div>
      </div>
      <p className="text-[11px] text-m3-on-surface-variant leading-relaxed opacity-60 group-hover:opacity-100 transition-all duration-500 relative z-10">{desc}</p>
    </button>
  );
}

function IntegrityStat({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 group/stat">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-m3-outline group-hover/stat:text-m3-primary transition-colors">{label}</span>
      <span className="text-xs font-bold text-m3-on-surface bg-m3-surface-variant/20 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">{value}</span>
    </div>
  );
}

function ArchNode({ icon, label, color }: { icon: React.ReactNode, label: string, color: string }) {
  return (
    <div className="flex flex-col items-center gap-6 group">
      <motion.div 
        whileHover={{ scale: 1.15, rotate: 8 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "w-24 h-24 rounded-[2rem] flex items-center justify-center text-white shadow-2xl relative overflow-hidden transition-all duration-500",
          color
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 drop-shadow-lg">
          {icon}
        </div>
      </motion.div>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 group-hover:opacity-100 group-hover:text-m3-primary transition-all duration-500">{label}</span>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="m3-card p-8 flex items-center justify-between group hover:bg-m3-primary/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-m3-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-m3-primary/10 transition-colors" />
      <div className="space-y-2 relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-m3-outline group-hover:text-m3-primary transition-colors">{label}</p>
        <p className="text-2xl font-bold text-m3-on-surface tracking-tight">{value}</p>
      </div>
      <div className="w-14 h-14 bg-m3-surface-variant/20 rounded-2xl flex items-center justify-center text-m3-on-surface-variant group-hover:scale-110 group-hover:bg-m3-primary/10 group-hover:text-m3-primary transition-all duration-500 shadow-inner relative z-10">
        {icon}
      </div>
    </div>
  );
}

function InsightCard({ title, desc, type }: { title: string, desc: string, type: 'success' | 'warning' | 'info' }) {
  const colors = {
    success: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5',
    warning: 'text-amber-500 bg-amber-500/5 border-amber-500/20 shadow-amber-500/5',
    info: 'text-blue-500 bg-blue-500/5 border-blue-500/20 shadow-blue-500/5'
  };

  return (
    <div className={cn("p-6 rounded-[2rem] border backdrop-blur-xl space-y-3 shadow-xl transition-all hover:scale-[1.02]", colors[type])}>
      <div className="flex items-center gap-3">
        <div className={cn("w-2 h-2 rounded-full animate-pulse", type === 'success' ? 'bg-emerald-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500')} />
        <h5 className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</h5>
      </div>
      <p className="text-xs leading-relaxed opacity-80">{desc}</p>
    </div>
  );
}

function HeaderAction({ icon, onClick }: { icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-3 hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-all text-m3-on-surface-variant hover:scale-110 active:scale-90"
    >
      {icon}
    </button>
  );
}

export default function App() {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Load initial state from localStorage or use defaults
  const [files, setFiles] = useState<FileData[]>(() => {
    const saved = localStorage.getItem('marathon_files');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        name: 'App.tsx',
        content: `export default function App() {\n  return (\n    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600">\n      <h1 className="text-4xl font-bold text-white">Hello, Marathon!</h1>\n    </div>\n  );\n}`,
        language: 'tsx'
      },
      {
        id: '2',
        name: 'styles.css',
        content: '@import "tailwindcss";',
        language: 'css'
      },
      {
        id: '3',
        name: 'index.tsx',
        content: `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport "./styles.css";\nimport App from "./App";\n\nconst root = createRoot(document.getElementById("root"));\nroot.render(<App />);`,
        language: 'tsx'
      }
    ];
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('marathon_messages');
    if (saved) {
      // Parse dates back to Date objects
      return JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
    return [];
  });

  const [terminalOutput, setTerminalOutput] = useState<string[]>(() => {
    const saved = localStorage.getItem('marathon_terminal');
    if (saved) return JSON.parse(saved);
    return ['[system] Marathon IDE initialized.', '[system] Ready for big app development.'];
  });

  // Save to localStorage whenever these states change
  useEffect(() => {
    localStorage.setItem('marathon_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('marathon_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('marathon_terminal', JSON.stringify(terminalOutput));
  }, [terminalOutput]);

  const [activeFileId, setActiveFileId] = useState('1');
  const [activeTab, setActiveTab] = useState<'chat' | 'code' | 'preview' | 'settings' | 'architecture' | 'history' | 'security' | 'marathon-ai'>('marathon-ai');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showKeySelection, setShowKeySelection] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [isPinSetup, setIsPinSetup] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('terminal:data', (data: string) => {
      setTerminalOutput(prev => {
        const lines = data.split('\n').filter(line => line.trim() !== '');
        return [...prev, ...lines].slice(-100); // Keep last 100 lines
      });
    });

    return () => {
      newSocket.close();
    };
  }, []);
  const [navItems, setNavItems] = useState([
    { id: 'chat', label: 'Assistant', icon: <MessageSquare size={20} /> },
    { id: 'code', label: 'Editor', icon: <Code2 size={20} /> },
    { id: 'preview', label: 'Preview', icon: <Play size={20} /> },
    { id: 'architecture', label: 'Architecture', icon: <FolderTree size={20} /> },
    { id: 'marathon-ai', label: 'Marathon AI', icon: <span className="font-broadway text-xl leading-none">M</span> },
    { id: 'history', label: 'History', icon: <History size={20} /> },
    { id: 'security', label: 'Security Log', icon: <ShieldCheck size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> }
  ]);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [securityLog, setSecurityLog] = useState<string[]>(['[security] Session started.', '[security] Encryption active.']);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [history, setHistory] = useState<{timestamp: Date, action: string, fileName: string}[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [settings, setSettings] = useState({
    fontSize: 14,
    fontFamily: 'JetBrains Mono',
    lineNumbers: true,
    autoSave: true
  });
  const [aiSecurity, setAiSecurity] = useState({
    neuralFirewall: true,
    deepPacketInspection: true,
    zeroTrustProtocol: false,
    quantumEncryption: true
  });
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    model: 'gemini-3.1-pro-preview',
    systemInstruction: `You are Marathon AI, a world-class senior software engineer and architect. 
You are working in the Marathon IDE, a high-performance coding environment.

Your goal is to help users build complex, large-scale web applications using React, Tailwind CSS, Lucide icons, and modern web standards.

Context Awareness:
- You will be provided with the content of the active file and other relevant files in the project.
- Use this context to ensure consistency across the codebase.

Code Generation Rules:
1. Provide a clear, professional explanation of your changes.
2. Provide the code in a single Markdown code block.
3. Ensure the code is complete, bug-free, and follows best practices.
4. Use modern React patterns (hooks, functional components, TypeScript).
5. Use Tailwind CSS for all styling.
6. If modifying existing code, provide the FULL updated file content.
7. Prioritize accessibility and performance.`,
    temperature: 0.7,
    useSearch: false,
    useThinking: false,
    aspectRatio: '1:1'
  });
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        setIsAuthenticated(data.isAuthenticated);
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuth();
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const [showOauthSetup, setShowOauthSetup] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      
      if (data.error === "MISSING_CREDENTIALS") {
        setShowOauthSetup(true);
        return;
      }
      
      if (data.url) {
        window.open(data.url, 'google_login', 'width=500,height=600');
      }
    } catch (e) {
      alert('Failed to start login. Please check server connection.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
    } catch (e) {
      alert('Logout failed');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    setTerminalOutput(prev => [...prev, `[ai] Processing request: ${input}`]);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    setSecurityLog(prev => [...prev, `[security] Input validated: ${userMessage.id}`]);

    // Check for API key if using gemini-3-pro-image-preview
    if (aiConfig.model === 'gemini-3-pro-image-preview') {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        setShowKeySelection(true);
        setIsGenerating(false);
        return;
      }
    }

    const { text, type } = await generateAIContent(input, activeFile, files, aiConfig);
    
    // Extract code block if present
    const codeMatch = text.match(/```(?:tsx|jsx|javascript|typescript|css|html)?\n([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
      const newContent = codeMatch[1].trim();
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: newContent } : f));
      setTerminalOutput(prev => [...prev, `[system] Updated ${activeFile?.name}`]);
      setHistory(prev => [{
        timestamp: new Date(),
        action: 'AI Update',
        fileName: activeFile?.name || 'Unknown'
      }, ...prev]);
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsGenerating(false);
  };

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const handleTTS = async (text: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    const base64Audio = await generateSpeech(text);
    if (base64Audio) {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play();
    } else {
      setIsPlayingAudio(false);
    }
  };

  const handleDeploy = () => {
    setIsDeploying(true);
    setDeployProgress(0);
    setTerminalOutput(prev => [...prev, '[deploy] Starting production build...']);
    
    const steps = [
      '[deploy] Compiling React components...',
      '[deploy] Optimizing Tailwind CSS...',
      '[deploy] Bundling assets with Vite...',
      '[deploy] Running security checks...',
      '[deploy] Uploading to edge network...',
      '[deploy] Configuring domain routing...',
      '[deploy] Deployment successful!',
      '[deploy] URL: https://marathon-app.deploy.com'
    ];

    let stepIndex = 0;
    
    const interval = setInterval(() => {
      setDeployProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDeploying(false);
          return 100;
        }
        
        if (stepIndex < steps.length) {
          setTerminalOutput(prevLog => [...prevLog, steps[stepIndex]]);
          stepIndex++;
        }
        
        return prev + (100 / steps.length);
      });
    }, 800);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = Math.max(200, Math.min(600, e.clientX - 80)); // 80 is the main nav width
        setSidebarWidth(newWidth);
      }
      if (isResizingTerminal) {
        const newHeight = Math.max(100, Math.min(600, window.innerHeight - e.clientY - 40));
        setTerminalHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingTerminal(false);
    };

    if (isResizingSidebar || isResizingTerminal) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingTerminal]);

  const activeFile = files.find(f => f.id === activeFileId);

  const copyToClipboard = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectKey = async () => {
    await (window as any).aistudio?.openSelectKey();
    setShowKeySelection(false);
    setSecurityLog(prev => [...prev, `[security] API Key updated via secure dialog.`]);
    handleSend();
  };

  const handleNewFile = () => {
    const name = prompt('Enter file name (e.g., utils.ts):');
    if (name) {
      const newFile: FileData = {
        id: Date.now().toString(),
        name,
        content: '// New file created\n',
        language: name.split('.').pop() || 'tsx'
      };
      setFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
      setTerminalOutput(prev => [...prev, `[system] Created new file: ${name}`]);
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleToggleLock = () => {
    if (!isPinSetup) {
      setShowPinEntry(true);
      return;
    }

    if (isLocked) {
      setShowPinEntry(true);
    } else {
      setIsLocked(true);
      setSecurityLog(prev => [...prev, `[security] Session locked.`]);
    }
  };

  const handlePinSubmit = (enteredPin: string) => {
    if (!isPinSetup) {
      if (enteredPin.length === 4) {
        setPin(enteredPin);
        setIsPinSetup(true);
        setShowPinEntry(false);
        setSecurityLog(prev => [...prev, `[security] PIN setup complete.`]);
      }
    } else {
      if (enteredPin === pin) {
        setIsLocked(false);
        setShowPinEntry(false);
        setSecurityLog(prev => [...prev, `[security] Session unlocked.`]);
      } else {
        setSecurityLog(prev => [...prev, `[security] Failed unlock attempt.`]);
        // Could add a shake animation or error state here
      }
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen bg-m3-surface flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-m3-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen bg-m3-surface items-center justify-center p-4 relative overflow-hidden">
        <div className="liquid-bg">
          <div className="liquid-blob" />
          <div className="liquid-blob" />
          <div className="liquid-blob" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="m3-card p-12 max-w-xl w-full text-center space-y-10 relative z-10 backdrop-blur-3xl"
        >
          <div className="space-y-6">
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="w-24 h-24 bg-m3-primary text-m3-on-primary rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-m3-primary/40"
            >
              <span className="font-broadway text-5xl">M</span>
            </motion.div>
            <div className="space-y-2">
              <h1 className="font-broadway text-6xl text-m3-primary tracking-tighter">MARATHON</h1>
              <p className="text-m3-on-surface-variant text-lg font-medium">The Future of Autonomous Development</p>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              className="m3-button-primary w-full py-5 text-lg flex items-center justify-center gap-3 group"
            >
              <LogIn size={24} className="group-hover:translate-x-1 transition-transform" />
              Sign in with Google
            </button>
            <button 
              onClick={() => setIsAuthenticated(true)}
              className="m3-button-tonal w-full py-5 text-lg opacity-60 hover:opacity-100"
            >
              Guest Access
            </button>
          </div>

          <div className="pt-8 border-t border-white/5 flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-m3-outline">
            <div className="flex items-center gap-2">
              <Shield size={12} />
              Neural Encryption
            </div>
            <div className="flex items-center gap-2">
              <Zap size={12} />
              Quantum Speed
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showOauthSetup && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="m3-card p-8 max-w-2xl w-full space-y-6"
              >
                <div className="flex items-center gap-4 text-m3-primary">
                  <AlertTriangle size={32} />
                  <h2 className="text-2xl font-bold">Google OAuth Not Configured</h2>
                </div>
                
                <div className="space-y-4 text-sm text-m3-on-surface-variant">
                  <p>To enable Google Sign-In, you must configure your OAuth credentials in the environment variables.</p>
                  
                  <div className="bg-m3-surface-variant/50 p-4 rounded-xl space-y-2 border border-white/5">
                    <h3 className="font-bold text-m3-on-surface">1. Create OAuth Credentials</h3>
                    <p>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-m3-primary hover:underline">Google Cloud Console</a> and create an OAuth 2.0 Client ID.</p>
                  </div>

                  <div className="bg-m3-surface-variant/50 p-4 rounded-xl space-y-2 border border-white/5">
                    <h3 className="font-bold text-m3-on-surface">2. Add Authorized Redirect URIs</h3>
                    <p>Add the following URLs to your OAuth client configuration:</p>
                    <code className="block bg-black/40 p-2 rounded text-xs font-mono text-emerald-400 select-all">
                      https://ais-dev-to6ac5jfaseglcrdo34ymd-60955861418.europe-west2.run.app/auth/google/callback
                    </code>
                    <code className="block bg-black/40 p-2 rounded text-xs font-mono text-emerald-400 select-all mt-2">
                      https://ais-pre-to6ac5jfaseglcrdo34ymd-60955861418.europe-west2.run.app/auth/google/callback
                    </code>
                  </div>

                  <div className="bg-m3-surface-variant/50 p-4 rounded-xl space-y-2 border border-white/5">
                    <h3 className="font-bold text-m3-on-surface">3. Set Environment Variables</h3>
                    <p>Add these variables to your AI Studio environment:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code className="text-m3-primary">GOOGLE_CLIENT_ID</code></li>
                      <li><code className="text-m3-primary">GOOGLE_CLIENT_SECRET</code></li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/5">
                  <button 
                    onClick={() => setShowOauthSetup(false)}
                    className="m3-button-tonal px-6 py-2"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-m3-surface overflow-hidden relative">
      {/* Liquid Background */}
      <div className="liquid-bg">
        <div className="liquid-blob" />
        <div className="liquid-blob" />
        <div className="liquid-blob" />
        
        {/* Floating Glass Elements */}
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[5%] w-32 h-32 m3-glass rounded-3xl opacity-20 pointer-events-none"
        />
        <motion.div 
          animate={{ 
            y: [0, 30, 0],
            rotate: [0, -10, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[15%] right-[10%] w-48 h-48 m3-glass rounded-[3rem] opacity-10 pointer-events-none"
        />
      </div>

      {/* Lock Screen Overlay */}
      <AnimatePresence>
        {isLocked && !showPinEntry && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-m3-surface flex flex-col items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 20, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              className="space-y-8 text-center"
            >
              <div className="w-24 h-24 bg-m3-primary-container text-m3-on-primary-container rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
                <Lock size={48} />
              </div>
              <div className="space-y-2">
                <h1 className="font-broadway text-4xl text-m3-on-surface">Marathon Secure</h1>
                <p className="text-m3-on-surface-variant">Your session is encrypted and locked.</p>
              </div>
              <button 
                onClick={handleToggleLock}
                className="m3-button-primary px-12"
              >
                Unlock Session
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN Entry Modal */}
      <AnimatePresence>
        {showPinEntry && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="m3-card bg-m3-surface p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-m3-primary-container text-m3-on-primary-container rounded-3xl flex items-center justify-center mx-auto">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-m3-on-surface mb-2">
                  {!isPinSetup ? 'Set Security PIN' : 'Enter PIN'}
                </h3>
                <p className="text-sm text-m3-on-surface-variant">
                  {!isPinSetup ? 'Create a 4-digit PIN to secure your workspace.' : 'Enter your 4-digit PIN to unlock.'}
                </p>
              </div>
              <div className="flex justify-center gap-3 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-12 h-14 rounded-xl border-2 border-m3-outline/20 flex items-center justify-center text-2xl font-bold text-m3-on-surface bg-m3-surface-variant/30">
                    <input 
                      type="password" 
                      maxLength={1} 
                      className="w-full h-full bg-transparent text-center outline-none"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && i < 4) {
                          const next = e.target.parentElement?.nextElementSibling?.querySelector('input');
                          if (next) next.focus();
                        }
                        
                        // Check if all filled
                        const inputs = e.target.parentElement?.parentElement?.querySelectorAll('input');
                        if (inputs) {
                          const fullPin = Array.from(inputs).map(inp => inp.value).join('');
                          if (fullPin.length === 4) {
                            handlePinSubmit(fullPin);
                            // Clear inputs if failed
                            if (isPinSetup && fullPin !== pin) {
                              inputs.forEach(inp => inp.value = '');
                              inputs[0].focus();
                            }
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !e.currentTarget.value && i > 1) {
                          const prev = e.currentTarget.parentElement?.previousElementSibling?.querySelector('input');
                          if (prev) {
                            prev.focus();
                            prev.value = '';
                          }
                        }
                      }}
                      autoFocus={i === 1}
                    />
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowPinEntry(false)}
                className="text-xs text-m3-on-surface-variant hover:text-m3-on-surface transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* API Key Selection Modal */}
      <AnimatePresence>
        {showKeySelection && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="m3-card bg-m3-surface p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-m3-primary-container text-m3-on-primary-container rounded-3xl flex items-center justify-center mx-auto">
                <Settings size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-m3-on-surface">API Key Required</h3>
                <p className="text-m3-on-surface-variant text-sm">
                  The selected model requires a paid Google Cloud project API key. 
                  Please select a key to continue.
                </p>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-m3-primary text-xs hover:underline block mt-2"
                >
                  Learn about billing and API keys
                </a>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSelectKey}
                  className="m3-button-primary w-full"
                >
                  Select API Key
                </button>
                <button 
                  onClick={() => setShowKeySelection(false)}
                  className="m3-button-tonal w-full"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sidebar - Expressive Navigation */}
      {!isSoloMode && (
        <aside className={cn(
          "m3-glass border-r-0 m-6 mr-0 rounded-[3rem] flex flex-col transition-all duration-700 ease-in-out relative z-30",
          isSidebarOpen ? "w-80" : "w-28"
        )}>
          <div className="flex items-center gap-5 p-10">
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.6 }}
              className="w-14 h-14 bg-m3-primary rounded-[1.5rem] flex items-center justify-center text-m3-on-primary shadow-2xl shadow-m3-primary/40 shrink-0"
            >
              <span className="font-broadway text-3xl">M</span>
            </motion.div>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-broadway text-3xl tracking-tighter text-m3-on-surface whitespace-nowrap"
              >
                MARATHON
              </motion.span>
            )}
          </div>

          <nav className="flex-1 flex flex-col gap-3 px-6 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <NavItem 
                key={item.id}
                icon={item.icon} 
                label={item.label} 
                active={activeTab === item.id} 
                onClick={() => setActiveTab(item.id as any)} 
                collapsed={!isSidebarOpen} 
              />
            ))}
            <div className="h-px bg-m3-outline/10 my-6 mx-4" />
            <NavItem 
              icon={<Eye size={20} />} 
              label="Solo Mode" 
              onClick={() => { setIsSoloMode(true); setActiveTab('code'); }} 
              collapsed={!isSidebarOpen} 
            />
            <NavItem 
              icon={isLocked ? <Unlock size={20} /> : <Lock size={20} />} 
              label={isLocked ? "Unlock" : "Lock Session"} 
              onClick={handleToggleLock} 
              collapsed={!isSidebarOpen} 
            />
          </nav>

          <div className="p-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-full m3-button-tonal py-4 flex items-center justify-center gap-3 rounded-[2rem]"
            >
              <ChevronRight className={cn("transition-transform duration-500", isSidebarOpen && "rotate-180")} size={24} />
              {isSidebarOpen && <span className="font-bold">Collapse</span>}
            </button>
          </div>
        </aside>
      )}

      {/* File Explorer (Secondary Sidebar) - Hidden as requested */}
      {false && isSidebarOpen && activeTab === 'code' && (
        <motion.aside 
          initial={{ width: 0, opacity: 0, x: -20 }}
          animate={{ width: sidebarWidth, opacity: 1, x: 0 }}
          exit={{ width: 0, opacity: 0, x: -20 }}
          className="m3-glass m-6 mr-0 rounded-[3rem] border-r-0 flex flex-col overflow-hidden relative group/sidebar z-20"
        >
          <div 
            onMouseDown={() => setIsResizingSidebar(true)}
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-m3-primary/40 transition-colors z-20"
          />
          <div className="p-10 border-b border-white/5 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-m3-primary/80">Project Files</span>
              <button 
                onClick={handleNewFile}
                className="w-10 h-10 flex items-center justify-center bg-m3-primary/10 hover:bg-m3-primary/20 rounded-2xl transition-all hover:scale-110"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="relative">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-m3-outline/60" />
              <input 
                type="text" 
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-m3-surface-variant/10 rounded-2xl pl-14 pr-6 py-4 text-xs outline-none focus:ring-2 focus:ring-m3-primary/40 transition-all backdrop-blur-3xl border border-white/5"
              />
            </div>
          </div>
          <Reorder.Group 
            axis="y" 
            values={files} 
            onReorder={setFiles}
            className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar"
          >
            {files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(file => (
              <Reorder.Item
                key={file.id}
                value={file}
                className="relative"
              >
                <button
                  onClick={() => setActiveFileId(file.id)}
                  className={cn(
                    "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm transition-all duration-500 group/file",
                    activeFileId === file.id 
                      ? "bg-m3-primary/20 text-m3-primary border border-m3-primary/30 shadow-2xl shadow-m3-primary/10 translate-x-2" 
                      : "text-m3-on-surface-variant hover:bg-m3-surface-variant/20 border border-transparent"
                  )}
                >
                  <div className={cn("transition-transform group-hover/file:scale-110", activeFileId === file.id && "scale-110")}>
                    {file.name.endsWith('.tsx') ? <FileCode size={20} /> : file.name.endsWith('.css') ? <FileText size={20} /> : <FileJson size={20} />}
                  </div>
                  <span className={cn("truncate font-bold tracking-tight", activeFileId === file.id ? "opacity-100" : "opacity-70")}>{file.name}</span>
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </motion.aside>
      )}

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col relative overflow-hidden transition-all duration-700",
        isSoloMode ? "m-0" : "m-6"
      )}>
        {/* Header */}
        {!isSoloMode && (
          <header className="h-24 m3-glass mb-6 rounded-[3rem] flex items-center justify-between px-12 z-10 border border-white/5">
            <div className="flex items-center gap-8">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-m3-on-surface tracking-tighter">{activeFile?.name || 'Untitled Project'}</h2>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-m3-primary/80">
                    {activeFile?.language.toUpperCase() || 'DRAFT'} ARCHITECTURE
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center bg-white/5 rounded-[2rem] p-1.5 backdrop-blur-3xl border border-white/10 shadow-inner">
                <HeaderAction icon={isFullScreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />} onClick={() => setIsFullScreen(!isFullScreen)} />
                <HeaderAction icon={isDarkMode ? <Sun size={22} /> : <Moon size={22} />} onClick={() => setIsDarkMode(!isDarkMode)} />
                <HeaderAction icon={copied ? <Check size={22} className="text-emerald-500" /> : <Copy size={22} />} onClick={copyToClipboard} />
              </div>
              
              <button 
                onClick={handleDeploy}
                disabled={isDeploying}
                className={cn(
                  "m3-button-primary py-4 px-10 text-sm relative overflow-hidden group shadow-2xl",
                  isDeploying && "opacity-80 cursor-not-allowed"
                )}
              >
                <div className="relative z-10 flex items-center gap-4">
                  {isDeploying ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="font-black">{deployProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} className="group-hover:rotate-12 transition-transform duration-500" />
                      <span className="font-black uppercase tracking-widest">Deploy</span>
                    </>
                  )}
                </div>
                {isDeploying && (
                  <motion.div 
                    className="absolute inset-0 bg-white/30 backdrop-blur-md"
                    initial={{ x: '-100%' }}
                    animate={{ x: `${deployProgress - 100}%` }}
                    transition={{ ease: "linear" }}
                  />
                )}
              </button>
            </div>
          </header>
        )}

        {/* Dynamic Viewport */}
        <div className={cn(
          "flex-1 relative overflow-hidden transition-all duration-700",
          isSoloMode ? "rounded-none" : "m3-glass rounded-[3.5rem] border border-white/5"
        )}>
          <AnimatePresence mode="wait">
            {activeTab === 'marathon-ai' && (
              <motion.div 
                key="marathon-ai"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-4xl mx-auto space-y-12">
                  <div className="text-center space-y-4">
                    <motion.h1 
                      initial={{ y: -20 }}
                      animate={{ y: 0 }}
                      className="font-broadway text-6xl text-m3-primary tracking-tighter"
                    >
                      MARATHON AI
                    </motion.h1>
                    <p className="text-m3-on-surface-variant text-lg max-w-2xl mx-auto">
                      The next generation of autonomous development. Powered by advanced reasoning and multimodal intelligence.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="m3-card p-8 space-y-6 group hover:border-m3-primary/30 transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-m3-primary/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
                      <div className="w-14 h-14 bg-m3-primary-container text-m3-on-primary-container rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-10">
                        <Cpu size={28} />
                      </div>
                      <div className="space-y-2 relative z-10">
                        <h3 className="text-xl font-bold text-m3-on-surface">Neural Engine v5</h3>
                        <p className="text-sm text-m3-on-surface-variant">
                          Real-time code analysis and predictive optimization. Marathon AI understands your intent before you even finish typing.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 relative z-10">
                        <div className="flex-1 h-1 bg-m3-outline/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '85%' }}
                            className="h-full bg-m3-primary"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-m3-primary">85% LOAD</span>
                      </div>
                    </div>

                    <div className="m3-card p-8 space-y-6 group hover:border-m3-tertiary/30 transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-m3-tertiary/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
                      <div className="w-14 h-14 bg-m3-tertiary-container text-m3-on-tertiary-container rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-10">
                        <Sparkles size={28} />
                      </div>
                      <div className="space-y-2 relative z-10">
                        <h3 className="text-xl font-bold text-m3-on-surface">Creative Synthesis</h3>
                        <p className="text-sm text-m3-on-surface-variant">
                          Generate high-fidelity UI assets, icons, and layout prototypes directly from natural language descriptions.
                        </p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('chat')}
                        className="m3-button-tonal w-full text-sm py-2 relative z-10"
                      >
                        Launch Creative Studio
                      </button>
                    </div>

                    <div className="m3-card p-8 space-y-6 group hover:border-emerald-500/30 transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
                      <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-10">
                        <Zap size={28} />
                      </div>
                      <div className="space-y-2 relative z-10">
                        <h3 className="text-xl font-bold text-m3-on-surface">Auto-Healing</h3>
                        <p className="text-sm text-m3-on-surface-variant">
                          Autonomous bug detection and resolution. Marathon AI fixes errors before they crash your application.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold relative z-10">
                        <ShieldCheck size={14} />
                        <span>System Protected</span>
                      </div>
                    </div>
                  </div>

                  <div className="m3-card p-8 bg-m3-primary/5 border-m3-primary/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                        <h4 className="font-bold uppercase text-xs tracking-widest text-m3-primary">Active Intelligence Status</h4>
                      </div>
                      <span className="text-[10px] font-mono opacity-50">LATENCY: 12ms</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                      {[
                        { label: 'Context Window', value: '2M Tokens', icon: <Database size={16} /> },
                        { label: 'Reasoning Depth', value: aiConfig.useThinking ? 'Deep Thinking' : 'Standard', icon: <Brain size={16} /> },
                        { label: 'Search Grounding', value: aiConfig.useSearch ? 'Live Web' : 'Offline', icon: <Globe size={16} /> },
                        { label: 'Safety Guard', value: aiSecurity.neuralFirewall ? 'Maximum' : 'Bypassed', icon: <Shield size={16} /> },
                      ].map((stat, i) => (
                        <div key={i} className="space-y-2 p-4 rounded-2xl bg-m3-surface-variant/30 border border-white/5 hover:bg-m3-surface-variant/50 transition-colors">
                          <div className="flex items-center gap-2 text-m3-primary/60">
                            {stat.icon}
                            <p className="text-[10px] uppercase tracking-widest">{stat.label}</p>
                          </div>
                          <p className="text-lg font-bold text-m3-on-surface">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center pt-8">
                    <button 
                      onClick={() => setActiveTab('chat')}
                      className="m3-button-primary px-12 flex items-center gap-3"
                    >
                      <MessageSquare size={20} />
                      Initialize AI Session
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0 flex flex-col p-6"
              >
                <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-m3-primary/20 blur-2xl rounded-full animate-pulse" />
                        <div className="w-20 h-20 bg-m3-primary-container rounded-[2rem] flex items-center justify-center text-m3-on-primary-container relative z-10 shadow-2xl shadow-m3-primary/30 border border-white/10">
                          <Terminal size={40} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black text-m3-on-surface tracking-tight">What are we building?</h3>
                        <p className="text-m3-on-surface-variant text-sm">
                          Describe your vision. Marathon AI will generate the code, structure the project, and deploy it instantly.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 w-full mt-8">
                        <SuggestionCard text="Create a login page" onClick={() => setInput("Create a beautiful login page with social icons")} />
                        <SuggestionCard text="Build a dashboard" onClick={() => setInput("Build a modern analytics dashboard with charts")} />
                        <SuggestionCard text="Setup a REST API" onClick={() => setInput("Create a basic Express server with user routes")} />
                        <SuggestionCard text="Design a landing page" onClick={() => setInput("Design a high-converting SaaS landing page")} />
                      </div>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        msg.role === 'user' ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "px-6 py-4 rounded-[2rem] relative group backdrop-blur-xl border",
                        msg.role === 'user' 
                          ? "bg-m3-primary/80 text-m3-on-primary rounded-tr-none border-white/20 shadow-xl shadow-m3-primary/20" 
                          : "bg-m3-surface-variant/40 text-m3-on-surface-variant rounded-tl-none border-white/10 shadow-lg"
                      )}>
                        {msg.role === 'assistant' && (
                          <button 
                            onClick={() => handleTTS(msg.content)}
                            className="absolute -right-10 top-0 p-2 bg-m3-surface-variant rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-m3-primary/20"
                            title="Speak message"
                          >
                            <Play size={14} className={isPlayingAudio ? "animate-pulse text-m3-primary" : ""} />
                          </button>
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Markdown
                            components={{
                              img({ src, alt }) {
                                return (
                                  <div className="my-4 rounded-2xl overflow-hidden border border-m3-outline/10 shadow-lg">
                                    <img src={src} alt={alt} className="w-full h-auto" referrerPolicy="no-referrer" />
                                  </div>
                                );
                              },
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    className="rounded-xl !bg-neutral-900 !my-2"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className={cn("bg-black/10 px-1 rounded", className)} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {msg.content}
                          </Markdown>
                        </div>
                      </div>
                      <span className="text-[10px] mt-1 opacity-50 px-2">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex items-center gap-3 text-m3-primary">
                      <div className="flex gap-1">
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-1.5 h-1.5 bg-m3-primary rounded-full"
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                          className="w-1.5 h-1.5 bg-m3-primary rounded-full"
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                          className="w-1.5 h-1.5 bg-m3-primary rounded-full"
                        />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {aiConfig.useThinking ? "Deep Reasoning Active..." : "Processing..."}
                      </span>
                      {aiConfig.useSearch && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-m3-primary/10 rounded-full border border-m3-primary/20">
                          <Search size={10} />
                          <span className="text-[10px] font-bold">Search Grounding</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="mt-6 relative">
                  <div className="m3-card p-2 flex items-center gap-2">
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask CodeCraft to build something..."
                      className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-m3-on-surface"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isGenerating}
                      className="w-10 h-10 bg-m3-primary text-m3-on-primary rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'code' && (
              <motion.div 
                key="code"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={cn(
                  "absolute inset-0 transition-all duration-500",
                  isFullScreen ? "p-0 z-50 bg-m3-surface" : "p-6"
                )}
              >
                <div className={cn(
                  "h-full overflow-hidden border border-m3-outline/10 bg-[#1e1e1e] shadow-2xl",
                  isFullScreen ? "rounded-none" : "rounded-3xl"
                )}>
                  <div className="bg-[#252526] px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Code2 size={16} className="text-blue-400" />
                      <select 
                        value={activeFileId}
                        onChange={(e) => setActiveFileId(e.target.value)}
                        className="bg-transparent text-xs text-gray-400 font-mono outline-none border-none cursor-pointer hover:text-gray-300"
                      >
                        {files.map(f => (
                          <option key={f.id} value={f.id} className="bg-[#252526] text-gray-400">
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                        <Search size={10} />
                        <span>UTF-8</span>
                      </div>
                      {isSoloMode && (
                        <button 
                          onClick={() => setIsSoloMode(false)}
                          className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400"
                          title="Exit Solo Mode"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                      </div>
                    </div>
                  </div>
                  <div className="h-full overflow-hidden rounded-b-3xl">
                    <Editor
                      height="100%"
                      language={activeFile?.language === 'tsx' ? 'typescript' : activeFile?.language || 'typescript'}
                      theme="vs-dark"
                      value={activeFile?.content || ''}
                      onChange={(value) => {
                        if (value !== undefined) {
                          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: value } : f));
                        }
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: settings.fontSize,
                        fontFamily: settings.fontFamily,
                        lineNumbers: settings.lineNumbers ? 'on' : 'off',
                        wordWrap: 'on',
                        padding: { top: 24, bottom: 24 },
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        formatOnPaste: true,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'preview' && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 p-6 flex flex-col gap-4"
              >
                <div className="flex-1 bg-white rounded-3xl shadow-2xl border border-m3-outline/10 overflow-hidden flex flex-col">
                  <div className="bg-m3-surface-variant/30 px-4 py-2 flex items-center gap-4 border-b border-m3-outline/10">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-m3-surface rounded-full px-3 py-1 text-[10px] text-m3-on-surface-variant font-mono border border-m3-outline/5 flex items-center justify-between">
                      <span>localhost:3000</span>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[8px] uppercase tracking-widest opacity-50">Live</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-50 flex items-center justify-center relative overflow-hidden rounded-b-3xl">
                    <SandpackProvider 
                      template="react-ts" 
                      theme="dark"
                      files={files.reduce((acc, file) => {
                        acc[`/${file.name}`] = file.content;
                        return acc;
                      }, {} as Record<string, string>)}
                      customSetup={{
                        dependencies: {
                          "lucide-react": "latest",
                          "framer-motion": "latest",
                          "tailwindcss": "latest",
                          "clsx": "latest",
                          "tailwind-merge": "latest"
                        }
                      }}
                    >
                      <div className="w-full h-full">
                        <SandpackPreview 
                          showOpenInCodeSandbox={false} 
                          showRefreshButton={true} 
                          style={{ height: '100%' }} 
                        />
                      </div>
                    </SandpackProvider>
                  </div>
                </div>

                {/* Terminal */}
                <div 
                  style={{ height: terminalHeight }}
                  className="m3-card overflow-hidden flex flex-col bg-black border-m3-primary/20 relative group/terminal"
                >
                  <div 
                    onMouseDown={() => setIsResizingTerminal(true)}
                    className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-m3-primary/30 transition-colors z-20"
                  />
                  <div className="px-4 py-2 bg-neutral-900 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-m3-primary border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <TerminalIcon size={12} />
                      <span>Debug Console</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-emerald-500/50">Node v20.10.0</span>
                      <button onClick={() => setTerminalOutput(["Terminal initialized..."])} className="hover:text-white transition-colors">Clear</button>
                    </div>
                  </div>
                  <div className="flex-1 p-4 font-mono text-[11px] text-emerald-500 overflow-y-auto custom-scrollbar min-h-[100px]">
                    {terminalOutput.map((line, i) => (
                      <div key={i} className="mb-1 flex gap-3">
                        <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
                        <span className="opacity-50">$</span>
                        <span>{line}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="opacity-50">$</span>
                      <input 
                        type="text" 
                        className="bg-transparent border-none outline-none flex-1 text-emerald-400"
                        placeholder="Run command..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            if (socket) {
                              socket.emit('terminal:write', val);
                              setTerminalOutput(prev => [...prev, `> ${val}`]);
                            } else {
                              setTerminalOutput(prev => [...prev, val, `[error] Terminal not connected.`]);
                            }
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'architecture' && (
              <motion.div 
                key="architecture"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-5xl mx-auto space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-m3-on-surface tracking-tight">System Architecture</h3>
                      <p className="text-m3-on-surface-variant">Real-time visualization of your application's structural integrity.</p>
                    </div>
                    <div className="m3-glass px-6 py-3 rounded-2xl flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-m3-primary">ANALYSIS ACTIVE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                      <div className="m3-card p-8 min-h-[400px] relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 opacity-10">
                          <div className="grid grid-cols-8 h-full">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className="border-r border-m3-primary/30" />
                            ))}
                          </div>
                        </div>
                        <div className="relative z-10 text-center space-y-6">
                          <div className="flex justify-center gap-8">
                            <ArchNode icon={<Database size={24} />} label="Backend" color="bg-blue-500" />
                            <ArchNode icon={<Code2 size={24} />} label="API" color="bg-purple-500" />
                            <ArchNode icon={<Layout size={24} />} label="Frontend" color="bg-emerald-500" />
                          </div>
                          <p className="text-sm text-m3-on-surface-variant max-w-sm mx-auto">
                            Your application follows a modern full-stack architecture with an Express.js core and a React-powered presentation layer.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <StatCard label="Component Density" value="High" icon={<Layout size={18} />} />
                        <StatCard label="API Latency" value="24ms" icon={<Terminal size={18} />} />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase tracking-widest text-m3-primary">AI Insights</h4>
                      <div className="space-y-4">
                        <InsightCard 
                          title="Performance Boost" 
                          desc="Consider memoizing the main viewport to reduce re-renders during code generation."
                          type="warning"
                        />
                        <InsightCard 
                          title="Security Check" 
                          desc="All API endpoints are currently protected by session-based authentication."
                          type="success"
                        />
                        <InsightCard 
                          title="Code Quality" 
                          desc="Your TypeScript definitions are 98% complete. Excellent type safety."
                          type="info"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 p-8 overflow-auto"
              >
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-m3-on-surface">Change History</h3>
                    <button 
                      onClick={() => setHistory([])}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Clear Log
                    </button>
                  </div>
                  
                  {history.length === 0 ? (
                    <div className="m3-card p-12 text-center space-y-4 opacity-50">
                      <History size={48} className="mx-auto" />
                      <p>No changes recorded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item, i) => (
                        <div key={i} className="m3-card p-4 flex items-center justify-between hover:bg-m3-surface-variant/20 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-m3-secondary-container text-m3-on-secondary-container rounded-xl flex items-center justify-center">
                              <FileCode size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-m3-on-surface">{item.action}</p>
                              <p className="text-xs text-m3-on-surface-variant">Modified {item.fileName}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-m3-on-surface-variant font-mono">
                            {item.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-5xl mx-auto space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-m3-on-surface tracking-tight">Security Command Center</h3>
                      <p className="text-m3-on-surface-variant">Manage autonomous defense protocols and neural encryption.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="m3-glass px-6 py-3 rounded-2xl flex items-center gap-3">
                        <ShieldCheck className="text-emerald-500" size={20} />
                        <span className="text-xs font-bold text-emerald-500">SYSTEM SECURE</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                      <div className="m3-card p-8 space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-m3-primary/5 rounded-bl-[100px] -mr-16 -mt-16 pointer-events-none" />
                        <div className="flex items-center justify-between relative z-10">
                          <h4 className="text-sm font-black uppercase tracking-widest text-m3-primary flex items-center gap-2">
                            <Shield size={16} />
                            AI Security Protocols
                          </h4>
                          <span className="text-[10px] font-mono opacity-50 bg-m3-surface-variant px-2 py-1 rounded-md border border-white/5">ACTIVE DEFENSE: v5.0.0</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                          <SecurityToggle 
                            label="Neural Firewall" 
                            desc="AI-driven packet filtering and intrusion detection."
                            active={aiSecurity.neuralFirewall}
                            onClick={() => {
                              setAiSecurity(prev => ({ ...prev, neuralFirewall: !prev.neuralFirewall }));
                              setSecurityLog(prev => [...prev, `[security] Neural Firewall ${!aiSecurity.neuralFirewall ? 'enabled' : 'disabled'}.`]);
                            }}
                          />
                          <SecurityToggle 
                            label="Deep Packet Inspection" 
                            desc="Real-time analysis of all incoming AI data streams."
                            active={aiSecurity.deepPacketInspection}
                            onClick={() => {
                              setAiSecurity(prev => ({ ...prev, deepPacketInspection: !prev.deepPacketInspection }));
                              setSecurityLog(prev => [...prev, `[security] DPI ${!aiSecurity.deepPacketInspection ? 'enabled' : 'disabled'}.`]);
                            }}
                          />
                          <SecurityToggle 
                            label="Zero-Trust Protocol" 
                            desc="Strict identity verification for every internal request."
                            active={aiSecurity.zeroTrustProtocol}
                            onClick={() => {
                              setAiSecurity(prev => ({ ...prev, zeroTrustProtocol: !prev.zeroTrustProtocol }));
                              setSecurityLog(prev => [...prev, `[security] Zero-Trust ${!aiSecurity.zeroTrustProtocol ? 'enabled' : 'disabled'}.`]);
                            }}
                          />
                          <SecurityToggle 
                            label="Quantum Encryption" 
                            desc="Post-quantum cryptographic algorithms for data at rest."
                            active={aiSecurity.quantumEncryption}
                            onClick={() => {
                              setAiSecurity(prev => ({ ...prev, quantumEncryption: !prev.quantumEncryption }));
                              setSecurityLog(prev => [...prev, `[security] Quantum Encryption ${!aiSecurity.quantumEncryption ? 'enabled' : 'disabled'}.`]);
                            }}
                          />
                        </div>
                      </div>

                      <div className="m3-card p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
                        <div className="flex items-center justify-between relative z-10">
                          <h4 className="text-sm font-black uppercase tracking-widest text-m3-primary flex items-center gap-2">
                            <Activity size={16} />
                            Live Threat Audit
                          </h4>
                          <button 
                            onClick={() => setSecurityLog(['[security] Audit log cleared.'])}
                            className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20"
                          >
                            CLEAR LOG
                          </button>
                        </div>
                        <div className="bg-black/60 rounded-3xl p-6 font-mono text-[11px] text-emerald-500 space-y-2 border border-emerald-500/20 h-48 overflow-y-auto custom-scrollbar relative z-10 shadow-inner">
                          {securityLog.map((log, i) => (
                            <div key={i} className="flex gap-4 hover:bg-white/5 px-2 py-1 rounded transition-colors">
                              <span className="opacity-40">[{new Date().toLocaleTimeString()}]</span>
                              <span className={log.includes('Failed') ? 'text-red-400' : ''}>{log}</span>
                            </div>
                          ))}
                          <div className="animate-pulse px-2">_</div>
                        </div>
                        
                        <div className="pt-4 space-y-4 relative z-10">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-m3-outline">Neural Threat Map</h4>
                          <div className="h-32 m3-glass rounded-2xl relative overflow-hidden flex items-center justify-center border border-emerald-500/10">
                            <div className="absolute inset-0 opacity-20">
                              <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--m3-primary)_0%,_transparent_70%)] animate-pulse" />
                            </div>
                            <div className="relative z-10 flex gap-1 items-end h-16 w-full px-8">
                              {Array.from({ length: 40 }).map((_, i) => (
                                <motion.div 
                                  key={i}
                                  animate={{ height: [10, Math.random() * 50 + 10, 10] }}
                                  transition={{ duration: 1.5 + Math.random(), repeat: Infinity, delay: i * 0.05 }}
                                  className="flex-1 bg-emerald-500/40 rounded-t-sm"
                                />
                              ))}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                            <div className="absolute bottom-2 right-4 text-[8px] font-mono text-emerald-500/60 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                              SCANNING SECTOR 7G...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="m3-card p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-m3-secondary/10 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-m3-primary relative z-10 flex items-center gap-2">
                          <Fingerprint size={16} />
                          Session Integrity
                        </h4>
                        <div className="space-y-4 relative z-10">
                          <IntegrityStat label="Encryption" value={aiSecurity.quantumEncryption ? "Quantum-Safe" : "AES-256-GCM"} />
                          <IntegrityStat label="Identity" value="Verified (Google)" />
                          <IntegrityStat label="Session ID" value={`MS-${Math.random().toString(36).substring(7).toUpperCase()}`} />
                          <IntegrityStat label="Neural Load" value="Optimal" />
                        </div>
                        <div className="pt-4 relative z-10">
                          <button 
                            onClick={handleToggleLock}
                            className="m3-button-tonal w-full py-4 text-xs flex items-center justify-center gap-2 font-bold tracking-wide"
                          >
                            <Lock size={16} />
                            Lock Workspace
                          </button>
                        </div>
                      </div>

                      <div className="m3-card p-8 bg-gradient-to-br from-m3-primary/10 to-transparent border-m3-primary/20 space-y-4 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-m3-primary/10 rotate-12 pointer-events-none">
                          <ShieldAlert size={120} />
                        </div>
                        <div className="flex items-center gap-3 text-m3-primary relative z-10">
                          <AlertTriangle size={20} />
                          <h5 className="font-bold text-sm">Security Advisory</h5>
                        </div>
                        <p className="text-xs text-m3-on-surface-variant leading-relaxed relative z-10">
                          Your workspace is currently operating under high-security protocols. All AI-generated code is sanitized and sandboxed before execution.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 p-6 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-2xl mx-auto space-y-8 pb-12">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-m3-secondary-container rounded-2xl flex items-center justify-center text-m3-on-secondary-container">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-m3-on-surface">Settings</h3>
                      <p className="text-m3-on-surface-variant">Configure your AI assistant and editor preferences.</p>
                    </div>
                  </div>

                  <section className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-m3-primary">Security & Privacy</h4>
                    <div className="m3-card p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-m3-on-surface">Session Encryption</p>
                          <p className="text-xs text-m3-on-surface-variant">All AI interactions are processed through secure channels.</p>
                        </div>
                        <ShieldCheck className="text-emerald-500" size={24} />
                      </div>
                      <div className="h-px bg-m3-outline/10" />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-m3-on-surface">PIN Protection</p>
                          <p className="text-xs text-m3-on-surface-variant">{isPinSetup ? 'PIN is active and protecting your session.' : 'Set a PIN to lock your workspace.'}</p>
                        </div>
                        <button 
                          onClick={handleToggleLock}
                          className="m3-button-tonal py-2 text-xs"
                        >
                          {isPinSetup ? 'Change PIN' : 'Setup PIN'}
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-m3-primary">MARATHON AI SECURITY</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SecurityToggle 
                        label="Neural Firewall" 
                        desc="AI-driven packet filtering."
                        active={aiSecurity.neuralFirewall}
                        onClick={() => setAiSecurity(prev => ({ ...prev, neuralFirewall: !prev.neuralFirewall }))}
                      />
                      <SecurityToggle 
                        label="Quantum Encryption" 
                        desc="Post-quantum cryptographic algorithms."
                        active={aiSecurity.quantumEncryption}
                        onClick={() => setAiSecurity(prev => ({ ...prev, quantumEncryption: !prev.quantumEncryption }))}
                      />
                      <SecurityToggle 
                        label="Deep Packet Inspection" 
                        desc="Real-time analysis."
                        active={aiSecurity.deepPacketInspection}
                        onClick={() => setAiSecurity(prev => ({ ...prev, deepPacketInspection: !prev.deepPacketInspection }))}
                      />
                      <SecurityToggle 
                        label="Zero-Trust Protocol" 
                        desc="Strict identity verification."
                        active={aiSecurity.zeroTrustProtocol}
                        onClick={() => setAiSecurity(prev => ({ ...prev, zeroTrustProtocol: !prev.zeroTrustProtocol }))}
                      />
                    </div>
                    <button 
                      onClick={() => setActiveTab('security')}
                      className="text-xs text-m3-primary font-bold hover:underline flex items-center gap-2"
                    >
                      Open Security Command Center <ArrowRight size={12} />
                    </button>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-m3-primary">AI Configuration</h4>
                    <div className="m3-card p-6 space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-m3-on-surface">Model Selection</label>
                        <select 
                          value={aiConfig.model}
                          onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                          className="w-full m3-input bg-m3-surface"
                        >
                          <optgroup label="Gemini 3 Series (Latest)">
                            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Advanced Reasoning)</option>
                            <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast & Capable)</option>
                            <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image (Generation)</option>
                          </optgroup>
                          <optgroup label="Gemini 2.5 Series">
                            <option value="gemini-2.5-flash-latest">Gemini 2.5 Flash</option>
                            <option value="gemini-2.5-flash-lite-latest">Gemini 2.5 Flash Lite</option>
                          </optgroup>
                        </select>
                      </div>

                      {aiConfig.model === 'gemini-3-pro-image-preview' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-m3-on-surface">Aspect Ratio</label>
                          <select 
                            value={aiConfig.aspectRatio}
                            onChange={(e) => setAiConfig(prev => ({ ...prev, aspectRatio: e.target.value }))}
                            className="w-full m3-input bg-m3-surface"
                          >
                            <option value="1:1">1:1 (Square)</option>
                            <option value="2:3">2:3 (Portrait)</option>
                            <option value="3:2">3:2 (Landscape)</option>
                            <option value="3:4">3:4 (Classic Portrait)</option>
                            <option value="4:3">4:3 (Classic Landscape)</option>
                            <option value="9:16">9:16 (Story)</option>
                            <option value="16:9">16:9 (Widescreen)</option>
                            <option value="21:9">21:9 (Ultrawide)</option>
                          </select>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-m3-on-surface">Search Grounding</p>
                            <p className="text-xs text-m3-on-surface-variant">Use Google Search for up-to-date info.</p>
                          </div>
                          <button 
                            onClick={() => setAiConfig(prev => ({ ...prev, useSearch: !prev.useSearch }))}
                            className={cn(
                              "w-12 h-6 rounded-full relative transition-colors duration-300",
                              aiConfig.useSearch ? "bg-m3-primary" : "bg-m3-outline/30"
                            )}
                          >
                            <motion.div 
                              animate={{ x: aiConfig.useSearch ? 24 : 4 }}
                              className="absolute left-0 top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-m3-on-surface">Thinking Mode</p>
                            <p className="text-xs text-m3-on-surface-variant">Maximize reasoning for complex tasks.</p>
                          </div>
                          <button 
                            onClick={() => setAiConfig(prev => ({ ...prev, useThinking: !prev.useThinking }))}
                            className={cn(
                              "w-12 h-6 rounded-full relative transition-colors duration-300",
                              aiConfig.useThinking ? "bg-m3-primary" : "bg-m3-outline/30"
                            )}
                          >
                            <motion.div 
                              animate={{ x: aiConfig.useThinking ? 24 : 4 }}
                              className="absolute left-0 top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                            />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium text-m3-on-surface">Temperature ({aiConfig.temperature})</label>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1"
                          value={aiConfig.temperature}
                          onChange={(e) => setAiConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                          className="w-full accent-m3-primary"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-m3-primary">Appearance</h4>
                    <div className="m3-card p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-m3-on-surface">Dark Mode</p>
                          <p className="text-xs text-m3-on-surface-variant">Switch between light and dark themes.</p>
                        </div>
                        <button 
                          onClick={() => setIsDarkMode(!isDarkMode)}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-colors duration-300",
                            isDarkMode ? "bg-m3-primary" : "bg-m3-outline/30"
                          )}
                        >
                          <motion.div 
                            animate={{ x: isDarkMode ? 24 : 4 }}
                            className="absolute left-0 top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>
                      <div className="h-px bg-m3-outline/10" />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-m3-on-surface">Solo Mode</p>
                          <p className="text-xs text-m3-on-surface-variant">Hide all UI elements for focused coding.</p>
                        </div>
                        <button 
                          onClick={() => setIsSoloMode(!isSoloMode)}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-colors duration-300",
                            isSoloMode ? "bg-m3-primary" : "bg-m3-outline/30"
                          )}
                        >
                          <motion.div 
                            animate={{ x: isSoloMode ? 24 : 4 }}
                            className="absolute left-0 top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>
                    </div>
                  </section>

                  <div className="pt-8 border-t border-m3-outline/10 flex items-center justify-between">
                    <p className="text-[10px] text-m3-on-surface-variant uppercase tracking-widest">Version 2.4.0 (Major Update)</p>
                    <button 
                      onClick={handleLogout}
                      className="text-xs text-red-500 font-bold hover:underline flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, collapsed?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-5 p-5 rounded-[2rem] transition-all duration-500 group relative overflow-hidden backdrop-blur-3xl border border-transparent",
        active 
          ? "bg-m3-primary/20 text-m3-primary border-m3-primary/30 shadow-2xl shadow-m3-primary/10 translate-x-1" 
          : "text-m3-on-surface-variant hover:bg-white/5 hover:border-white/10",
        collapsed && "justify-center p-5"
      )}
    >
      <div className={cn("relative z-10 transition-transform duration-500 group-hover:scale-110", active && "scale-110")}>
        {icon}
      </div>
      {!collapsed && (
        <span className={cn("relative z-10 font-bold tracking-tight transition-all duration-500", active ? "opacity-100" : "opacity-60 group-hover:opacity-100")}>
          {label}
        </span>
      )}
      {active && (
        <motion.div 
          layoutId="nav-active-glow"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-m3-primary rounded-full shadow-[0_0_15px_rgba(103,80,164,0.6)]"
        />
      )}
    </button>
  );
}

function SuggestionCard({ text, onClick }: { text: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-6 text-left m3-card hover:bg-m3-primary/10 hover:border-m3-primary/30 transition-all group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-m3-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <p className="text-sm font-bold text-m3-on-surface group-hover:text-m3-primary transition-colors relative z-10">{text}</p>
      <div className="flex items-center gap-2 mt-3 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-m3-outline group-hover:text-m3-primary/60 transition-colors">Try this</span>
        <ChevronRight size={12} className="text-m3-outline group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}
