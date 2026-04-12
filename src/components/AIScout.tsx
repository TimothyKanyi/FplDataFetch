import { memo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, ChevronUp, ChevronDown, Sparkles, User } from "lucide-react";
import { useAIContextString } from "@/hooks/useAIGlobalContext";
import type { Manager, GameweekChampion } from "@/hooks/useFplData";

interface AIScoutProps {
  leagueData: Manager[] | null;
  gameweekChampions: GameweekChampion[] | null;
  leagueName?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

// Groq AI Integration with Llama 3.3
const sendToAI = async (
  systemContext: string,
  userQuestion: string,
  history: Message[]
): Promise<string> => {
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return `🤖 AI Scout (Demo Mode)

Your question: "${userQuestion}"

To enable real AI, add to .env:
VITE_GROQ_API_KEY=your_key

Get a free API key at: https://console.groq.com/keys`;
  }

  try {
    // Build messages array for Groq (OpenAI-compatible format)
    const messages = [
      // System message with context
      {
        role: 'system' as const,
        content: `You are AI Scout, an expert FPL (Fantasy Premier League) analyst. Provide concise, insightful analysis. Use the following league context to answer questions:\n\n${systemContext}`
      },
      // Map history to OpenAI format
      ...history.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      // Add current question
      {
        role: 'user' as const,
        content: userQuestion,
      },
    ];

    // Call Groq API
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.7,
          max_tokens: 800,
          top_p: 0.9,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Extract text from Groq response
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('No response text from Groq');
    }

    return text;

  } catch (error) {
    console.error('AI Scout Error:', error);
    return `⚠️ Error: ${error instanceof Error ? error.message : 'Groq API error'}. Please check your API key and try again.`;
  }
};

const slideVariants = {
  hidden: { y: 100, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 }
  },
  exit: { 
    y: 100, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const messageVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  }
};

export const AIScout = memo(({ 
  leagueData, 
  gameweekChampions, 
  leagueName = "FPL League" 
}: AIScoutProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get AI context string for system message
  const contextString = useAIContextString(leagueData, gameweekChampions, leagueName);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendToAI(contextString, userMessage.content, messages);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, contextString, messages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setIsCollapsed(false);
    }
  }, [isOpen]);

  if (!leagueData?.length) return null;

  return (
    <>
      {/* Floating Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Button
              onClick={toggleOpen}
              className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Bot className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-4 right-4 z-50 w-[380px] sm:w-[420px]"
          >
            <Card className="shadow-2xl border-2 border-primary/20">
              {/* Header */}
              <CardHeader className="p-4 pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-primary to-accent">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">AI Scout</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Powered by League Context
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsCollapsed((prev) => !prev)}
                    >
                      {isCollapsed ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={toggleOpen}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="p-4 space-y-4">
                      {/* Messages */}
                      <ScrollArea 
                        className="h-[300px] pr-4" 
                        ref={scrollRef}
                      >
                        <div className="space-y-3">
                          {/* Welcome Message */}
                          {messages.length === 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex gap-3"
                            >
                              <div className="p-2 rounded-lg bg-primary/10 h-fit">
                                <Sparkles className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground">
                                  Ask me anything about your league! I can analyze standings, 
                                  identify trends, compare managers, and more.
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {[
                                    "Who's the most consistent?",
                                    "Analyze the top 3",
                                    "Transfer strategy tips",
                                  ].map((suggestion) => (
                                    <button
                                      key={suggestion}
                                      onClick={() => setInput(suggestion)}
                                      className="text-xs px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Chat Messages */}
                          {messages.map((message, index) => (
                            <motion.div
                              key={message.id}
                              variants={messageVariants}
                              initial="hidden"
                              animate="visible"
                              className={`flex gap-3 ${
                                message.role === "user" ? "flex-row-reverse" : ""
                              }`}
                            >
                              <div
                                className={`p-2 rounded-lg h-fit ${
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                {message.role === "user" ? (
                                  <User className="h-4 w-4" />
                                ) : (
                                  <Bot className="h-4 w-4" />
                                )}
                              </div>
                              <div
                                className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm ${
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{message.content}</p>
                                <span className="text-[10px] opacity-70 mt-1 block">
                                  {message.timestamp.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </motion.div>
                          ))}

                          {/* Loading Indicator */}
                          {isLoading && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex gap-3"
                            >
                              <div className="p-2 rounded-lg bg-muted">
                                <Bot className="h-4 w-4" />
                              </div>
                              <div className="flex-1 p-3 rounded-lg bg-muted">
                                <div className="flex gap-1">
                                  <motion.div
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.5, delay: 0 }}
                                    className="w-2 h-2 bg-primary rounded-full"
                                  />
                                  <motion.div
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                                    className="w-2 h-2 bg-primary rounded-full"
                                  />
                                  <motion.div
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
                                    className="w-2 h-2 bg-primary rounded-full"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </ScrollArea>

                      {/* Input */}
                      <div className="flex gap-2">
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Ask about your league..."
                          className="flex-1"
                          disabled={isLoading}
                        />
                        <Button
                          onClick={handleSend}
                          disabled={!input.trim() || isLoading}
                          size="icon"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
