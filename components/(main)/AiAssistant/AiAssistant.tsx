"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { usePost } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TBikeChatResponse, TChatMessage } from "./type/aiAssistant.types";

// ! module scope so this isn't recreated every render — only the AI's own replies get
// ! parsed as markdown (see the role check below), so these overrides only ever need to
// ! fit inside the small text-sm/max-w-[80%] assistant bubble style
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const text = String(children).replace(/\n$/, "");
    const isBlock =
      /language-(\w+)/.test(className ?? "") || text.includes("\n");
    if (!isBlock) {
      return (
        <code
          className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs"
          {...props}
        >
          {text}
        </code>
      );
    }
    return (
      <code className="font-mono text-xs" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded bg-black/10 p-2 last:mb-0">
      {children}
    </pre>
  ),
};

export default function AiAssistant() {
  const params = useParams();
  const bikeId = params.bikeId as string;

  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [prevBikeId, setPrevBikeId] = useState(bikeId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { mutateAsync, isPending } = usePost();

  if (bikeId !== prevBikeId) {
    setPrevBikeId(bikeId);
    setMessages([]);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isPending]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isPending) return;

    const userMessage: TChatMessage = { role: "user", content };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");

    try {
      const response = await mutateAsync({
        url: `/bikes/${bikeId}/ai/chat`,
        payload: { messages: history },
      });
      const reply = (response.data as TBikeChatResponse).reply;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong!!", { duration: 2000 });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col p-4">
      <h1 className="mb-3 shrink-0 text-lg font-semibold">AI Assistant</h1>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto"
      >
        {messages.length === 0 && !isPending ? (
          <p className="text-sm text-muted-foreground">
            Ask anything about this bike&apos;s fuel, mileage, or maintenance.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                message.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start border border-border bg-card",
              )}
            >
              {message.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          ))
        )}

        {isPending && (
          <div className="flex max-w-[80%] items-center gap-2 self-start rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            AI is thinking...
          </div>
        )}
      </div>

      <div className="mt-3 flex shrink-0 items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-11 resize-none"
          rows={1}
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={isPending || !input.trim()}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
