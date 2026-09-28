"use client";

import PageHeader from "@/components/shared/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFetchData, usePost } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { BookOpen, Loader2, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { TBike } from "../Bike/type/bike.types";
import { TBikeManualStatus } from "../BikeManual/type/bike-manual.types";
import { TBikeChatResponse, TChatMessage } from "./type/aiAssistant.types";

const STARTER_PROMPTS = [
  "When is my next oil change due?",
  "Why did my mileage change recently?",
  "How much did I spend on fuel this year?",
  "What tyre pressure does the manual recommend?",
];

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 ml-[18px] list-disc space-y-0.5 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-[18px] list-decimal space-y-0.5 last:mb-0">
      {children}
    </ol>
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
      className="text-primary underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const text = String(children).replace(/\n$/, "");
    const isBlock =
      /language-(\w+)/.test(className ?? "") || text?.includes("\n");
    if (!isBlock) {
      return (
        <code
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
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
    <pre className="mb-2 overflow-x-auto rounded-md bg-muted p-2 last:mb-0">
      {children}
    </pre>
  ),
};

export default function AiAssistant() {
  const params = useParams();
  const bikeId = params?.bikeId as string;

  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [prevBikeId, setPrevBikeId] = useState(bikeId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { mutateAsync, isPending } = usePost();

  // same keys as the hub / manual page — cached
  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );
  const { data: manualData } = useFetchData<TBikeManualStatus>(
    ["bikeManual", bikeId],
    `/bikes/${bikeId}/manual`,
  );
  const bikeName = bikeData?.data?.nickname ?? "this bike";
  const manual = manualData?.data?.manual;

  if (bikeId !== prevBikeId) {
    setPrevBikeId(bikeId);
    setMessages([]);
  }

  useEffect(() => {
    scrollRef?.current?.scrollTo({ top: scrollRef?.current?.scrollHeight });
  }, [messages, isPending]);

  const send = async (text: string) => {
    const content = text?.trim();
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
      const reply = (response?.data as TBikeChatResponse)?.reply;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong!!", { duration: 2000 });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e?.key === "Enter" && !e?.shiftKey) {
      e?.preventDefault();
      send(input);
    }
  };

  const isEmpty = messages?.length === 0 && !isPending;

  return (
    // fills the shell's main area: mobile minus header/tab bar, desktop minus padding
    <div className="flex h-[calc(100dvh-164px)] gap-6 lg:h-[calc(100dvh-80px)]">
      <div className="flex min-w-0 max-w-[760px] flex-1 flex-col gap-3">
        <PageHeader
          className="hidden lg:flex"
          title="AI Assistant"
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: bikeName, href: `/bikes/${bikeId}` },
            { label: "Assistant" },
          ]}
        />

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto"
        >
          <div className="flex-1" />

          {isEmpty ? (
            <div className="flex flex-col items-start gap-2.5 pb-2">
              <span className="grid size-10 place-items-center rounded-[10px] text-primary shadow-glow">
                <Sparkles className="size-5" />
              </span>
              <div className="text-lg font-medium">Ask about {bikeName}</div>
              <div className="max-w-[440px] text-[13.5px] text-muted-foreground">
                Answers use this bike’s fuel, mileage, maintenance and spending
                {manual ? " — and its owner’s manual." : "."}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {STARTER_PROMPTS?.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-lg px-3 py-2 text-left text-[13px] shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-surface-hover"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages?.map((message, index) =>
              message?.role === "user" ? (
                <div
                  key={index}
                  className="max-w-[80%] self-end rounded-[12px_12px_4px_12px] bg-accent px-3.5 py-[9px] text-[13.5px] whitespace-pre-wrap text-accent-foreground"
                >
                  {message?.content}
                </div>
              ) : (
                <div
                  key={index}
                  className="max-w-[86%] self-start rounded-[12px_12px_12px_4px] bg-card px-3.5 py-[11px] text-[13.5px] leading-[1.55] shadow-sm"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {message?.content}
                  </ReactMarkdown>
                </div>
              ),
            )
          )}

          {isPending && (
            <div className="flex items-center gap-2 self-start rounded-[12px_12px_12px_4px] bg-card px-3.5 py-[9px] text-[13px] text-muted-foreground shadow-sm">
              <Loader2 className="size-3.5 animate-spin" />
              AI is thinking…
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex shrink-0 items-end gap-2 rounded-xl bg-card p-1.5",
            isEmpty ? "shadow-glow" : "shadow-sm",
          )}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e?.target?.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="max-h-40 min-h-10 resize-none border-0 bg-transparent py-2.5 hover:border-0 focus-visible:ring-0"
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            className="size-10 shrink-0"
            onClick={() => send(input)}
            disabled={isPending || !input?.trim()}
            aria-label="Send"
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
        <div className="hidden text-[11.5px] text-muted-foreground lg:block">
          Enter to send · Shift + Enter for a new line · Conversation isn’t
          saved
        </div>
      </div>

      <aside className="hidden w-[280px] shrink-0 flex-col gap-3 pt-14 xl:flex">
        <div className="panel flex flex-col gap-2 px-4 py-3.5">
          <div className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Grounded in
          </div>
          {manual ? (
            <>
              <div className="flex items-center gap-2 text-[13px]">
                <BookOpen className="size-[15px] shrink-0 text-primary" />
                <span className="truncate">{manual?.originalName}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {manual?.chunkCount} sections · plus this bike’s logs
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px]">This bike’s logs</div>
              <Link
                href={`/bikes/${bikeId}/manual`}
                className="text-xs text-primary hover:underline"
              >
                Upload the owner’s manual →
              </Link>
            </>
          )}
        </div>
        <div className="panel flex flex-col gap-1.5 px-4 py-3.5">
          <div className="mb-0.5 text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Try asking
          </div>
          {STARTER_PROMPTS?.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              disabled={isPending}
              className="py-1.5 text-left text-[13px] hover:text-primary disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
