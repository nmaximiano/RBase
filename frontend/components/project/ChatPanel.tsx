"use client";

import React, { useState } from "react";
import { MODEL_OPTIONS, MODEL_DESCRIPTIONS, MODEL_LOGOS } from "@/lib/models";
import type { ChatMessage } from "@/lib/types";
import {
  ToolMessageItem,
  AssistantMessageItem,
  UserMessageItem,
  PlotMessageItem,
  AskUserMessageItem,
} from "@/components/project/ChatMessages";
import { PlanCard } from "@/components/project/PlanChecklist";
import { ChatInput } from "@/components/project/ChatInput";
import ApiKeyModal from "@/components/settings/ApiKeyModal";
import { useApiKey } from "@/lib/key/useApiKey";

interface ChatPanelProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
  onStopChat: () => void;
  onClearChat: () => void;
  onAgentAnswer: (askId: string, answer: string) => void;
  activeStableId: string | null;
  selectedModel: string | null;
  onModelChange: (modelId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  panelWidth?: number;
}

type RightPanelTab = "agent" | "config";

export { type ChatPanelProps };

export function ChatPanel({
  messages,
  isTyping,
  onSendMessage,
  onStopChat,
  onClearChat,
  onAgentAnswer,
  activeStableId,
  selectedModel,
  onModelChange,
  messagesEndRef,
  panelWidth,
}: ChatPanelProps) {
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("agent");
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const { hasKey, hydrated: keyHydrated } = useApiKey();

  return (
    <div
      className="group/panel shrink-0 border-l border-border bg-surface flex flex-col h-full"
      style={panelWidth ? { width: `${panelWidth}px` } : undefined}
    >
      {/* 'Agent / Config' tabs. Height (h-9) + tinted row bg match the
          dataset TabBar so every top chrome row lines up across the view. */}
      <div
        className="shrink-0 flex items-center h-9 bg-surface-alt"
        style={{ borderBottom: "1px solid var(--rbase-hairline)" }}
      >
        <MiniTab
          active={rightPanelTab === "agent"}
          onClick={() => setRightPanelTab("agent")}
        >
          Agent
        </MiniTab>
        <MiniTab
          active={rightPanelTab === "config"}
          onClick={() => setRightPanelTab("config")}
        >
          Config
        </MiniTab>
        {rightPanelTab === "agent" && messages.length > 0 && (
          <button
            onClick={onClearChat}
            disabled={isTyping}
            title="Clear conversation"
            className="ml-auto mr-2 opacity-0 group-hover/panel:opacity-100 transition-opacity disabled:opacity-0 cursor-pointer p-1"
            style={{ color: "var(--rbase-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--rbase-danger)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--rbase-muted)")}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        )}
      </div>

      {/* Config panel */}
      {rightPanelTab === "config" && (
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">Model</label>
              <div className="space-y-1">
                {MODEL_OPTIONS.map((m) => {
                  const isExpanded = expandedModel === m.id;
                  const desc = MODEL_DESCRIPTIONS[m.id];
                  return (
                    <div key={m.id}>
                      <div
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                          selectedModel === m.id
                            ? "bg-accent/10 border border-accent text-text"
                            : "border border-border text-text-secondary hover:border-accent/40 hover:bg-surface-alt"
                        }${isExpanded ? " rounded-b-none" : ""}`}
                      >
                        <button
                          onClick={() => onModelChange(m.id)}
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                        >
                          {MODEL_LOGOS[m.id]}
                          <span className="truncate">{m.label}</span>
                          {m.recommended && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium shrink-0">
                              Recommended
                            </span>
                          )}
                        </button>
                        <span className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            onClick={() => setExpandedModel(isExpanded ? null : m.id)}
                            className="text-text-muted hover:text-text transition-colors cursor-pointer p-0.5"
                            title={isExpanded ? "Hide details" : "Show details"}
                          >
                            <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                        </span>
                      </div>
                      {isExpanded && desc && (
                        <div className={`px-3 py-2.5 text-xs leading-relaxed border border-t-0 rounded-b-lg ${
                          selectedModel === m.id ? "border-accent bg-accent/5" : "border-border bg-surface-alt/50"
                        }`}>
                          <p className="text-text-secondary">{desc}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Calls go directly from your browser to OpenRouter with your key. You&apos;re billed by OpenRouter.
            </p>
          </div>
        </div>
      )}

      {/* Messages area */}
      {rightPanelTab === "agent" && <div className="flex-1 overflow-y-auto" data-chat-scroll>
        {messages.length === 0 && !isTyping ? (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            {keyHydrated && !hasKey ? (
              <>
                <svg className="w-8 h-8 text-accent mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                <h3 className="text-sm font-semibold text-text mb-1">
                  Connect your OpenRouter key
                </h3>
                <p className="text-xs text-text-muted mb-5 max-w-[280px] leading-relaxed">
                  The agent runs in your browser and calls OpenRouter directly with your key.
                  Your key stays on this device.
                </p>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  Connect key
                </button>
              </>
            ) : (
              <EmptyAgentState />
            )}
          </div>
        ) : (
          <div className="px-4 py-4 space-y-5">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "plan" && msg.planSteps ? (
                  <PlanCard steps={msg.planSteps} isActive={msg.planActive ?? false} />
                ) : msg.role === "tool" ? (
                  <ToolMessageItem msg={msg} />
                ) : msg.role === "plot" && msg.imageSrc ? (
                  <PlotMessageItem msg={msg} />
                ) : msg.askId && !msg.answered ? (
                  <AskUserMessageItem msg={msg} onAnswer={onAgentAnswer} />
                ) : msg.role === "assistant" ? (
                  <AssistantMessageItem msg={msg} />
                ) : (
                  <UserMessageItem msg={msg} />
                )}
              </div>
            ))}

            {isTyping && (
              <div className="pr-8">
                <div className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-text-secondary"
                      style={{ animation: "typing-dot 1.4s ease-in-out infinite", animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-text-secondary"
                      style={{ animation: "typing-dot 1.4s ease-in-out infinite", animationDelay: "200ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-text-secondary"
                      style={{ animation: "typing-dot 1.4s ease-in-out infinite", animationDelay: "400ms" }}
                    />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>}

      {/* Input area */}
      {rightPanelTab === "agent" && (
        keyHydrated && !hasKey ? (
          <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between gap-3 bg-surface-alt/40">
            <span className="text-xs text-text-muted truncate">
              OpenRouter key required to chat
            </span>
            <button
              onClick={() => setShowKeyModal(true)}
              className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover transition-colors cursor-pointer"
            >
              Connect key
            </button>
          </div>
        ) : (
          <ChatInput
            onSend={onSendMessage}
            onStop={onStopChat}
            isTyping={isTyping}
            disabled={false}
          />
        )
      )}

      <ApiKeyModal open={showKeyModal} onClose={() => setShowKeyModal(false)} />
    </div>
  );
}

// Compact empty state for the agent panel. Title + lede only; no
// starter prompt pills (they read as buttons that auto-submit, which
// users didn't want).
function EmptyAgentState() {
  return (
    <div className="max-w-[300px]">
      <h3 className="text-[13px] font-medium text-text mb-1">
        Start with a <span style={{ fontStyle: "italic" }}>question</span>.
      </h3>
      <p className="text-[12px] text-text-muted leading-relaxed">
        The agent writes R, runs it, and iterates.
      </p>
    </div>
  );
}

function MiniTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center h-full px-4 cursor-pointer transition-colors"
      style={{
        fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        // Invert the tint pattern: inactive tabs carry the chip tint,
        // active tab merges into the paper row.
        background: active ? "var(--rbase-paper)" : "var(--rbase-paper-tint)",
        color: active ? "var(--rbase-ink)" : "var(--rbase-muted)",
        borderRight: "1px solid var(--rbase-hairline)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "var(--rbase-ink)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "var(--rbase-muted)";
      }}
    >
      {children}
    </button>
  );
}
