"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/utils/cn";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Undo2,
  Redo2,
  WrapText,
  FileDown,
  FileUp,
  History,
  Settings2,
  WandSparkles,
  Search,
  Layers,
  Variable,
  Plus,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface VariableDef {
  name: string;
  type: "text" | "number" | "select" | "boolean";
  defaultValue: string;
  required: boolean;
  description: string;
  options?: string[];
}

interface VersionEntry {
  id: string;
  version: number;
  content: string;
  changelog: string;
  createdAt: string;
}

const sampleVariables: VariableDef[] = [
  { name: "topic", type: "text", defaultValue: "artificial intelligence", required: true, description: "Main topic of the prompt" },
  { name: "tone", type: "select", defaultValue: "professional", required: false, description: "Writing tone", options: ["professional", "casual", "creative"] },
  { name: "maxLength", type: "number", defaultValue: "500", required: false, description: "Maximum response length" },
  { name: "includeExamples", type: "boolean", defaultValue: "true", required: false, description: "Include examples" },
];

const sampleVersions: VersionEntry[] = [
  { id: "1", version: 3, content: "", changelog: "Added variables and examples", createdAt: "2 hours ago" },
  { id: "2", version: 2, content: "", changelog: "Optimized structure", createdAt: "5 hours ago" },
  { id: "3", version: 1, content: "", changelog: "Initial creation", createdAt: "1 day ago" },
];

export function PromptEditor() {
  const [content, setContent] = useState(`You are an expert {{role}} specializing in {{topic}}.

## Objective
{{objective}}

## Requirements
1. {{requirement1}}
2. {{requirement2}}
3. {{requirement3}}

## Output Format
\`\`\`{{format}}
[output]
\`\`\`

## Constraints
- Keep response under {{maxLength}} words
- Use a {{tone}} tone
{{#includeExamples}}
- Include relevant examples
{{/includeExamples}}
`);
  const [title, setTitle] = useState("Untitled Prompt");
  const [showVariables, setShowVariables] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Untitled Prompt",
          content,
          description: "",
          platform: "CHATGPT",
          isPublic: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save prompt");
      }
      setSaved(true);
      setCopied(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save prompt");
    } finally {
      setSaving(false);
    }
  };

  const lines = content.split("\n");

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = content.substring(0, start) + "  " + content.substring(end);
      setContent(newValue);
      setSaved(false);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  }, [content, title]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightSyntax = (line: string) => {
    const parts: { text: string; className: string }[] = [];
    const tokenPattern = /(\{\{.*?\}\}|`{3}|#[^\n]*|"(?:[^"\\]|\\.)*"|\b\d+\b)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: line.slice(lastIndex, match.index), className: "" });
      }
      const token = match[0];
      let className = "";
      if (token.startsWith("{{")) className = "text-emerald-400";
      else if (token.startsWith("```")) className = "text-amber-400";
      else if (token.startsWith("#")) className = "text-charcoal-600";
      else if (token.startsWith('"')) className = "text-blue-400";
      else if (/^\d+$/.test(token)) className = "text-purple-400";
      parts.push({ text: token, className });
      lastIndex = match.index + token.length;
    }
    if (lastIndex < line.length) {
      parts.push({ text: line.slice(lastIndex), className: "" });
    }

    return parts;
  };

  const renderLineNumbers = () => {
    if (!lineNumbers) return null;
    return (
      <div className="select-none text-end pe-4 text-charcoal-600 text-sm leading-6 font-mono py-4 min-w-[48px]">
        {lines.map((_, i) => (
          <div key={i} className="hover:text-charcoal-500 transition-colors">
            {i + 1}
          </div>
        ))}
      </div>
    );
  };

  const renderHighlightedContent = () => {
    return (
      <div className="relative text-sm leading-6 font-mono py-4" aria-hidden="true">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre">
            {line ? (
              highlightSyntax(line).map((part, j) =>
                part.className ? (
                  <span key={j} className={part.className}>{part.text}</span>
                ) : (
                  <span key={j}>{part.text}</span>
                )
              )
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-charcoal-800/50 bg-charcoal-900/30">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent text-sm font-medium text-charcoal-200 border-none outline-none focus:text-emerald-400 transition-colors min-w-0 flex-1"
            />
            {!saved && (
              <Badge variant="default" size="sm">Unsaved</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={handleSave} disabled={saving} title="Save (Ctrl+S)">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon-sm">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm">
              <Redo2 className="h-4 w-4" />
            </Button>
            <div className="w-px h-5 bg-charcoal-800 mx-1" />
            <Button variant="ghost" size="icon-sm" onClick={() => setWordWrap(!wordWrap)}>
              <WrapText className={cn("h-4 w-4", wordWrap && "text-emerald-400")} />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
            <div className="w-px h-5 bg-charcoal-800 mx-1" />
            <Button variant="ghost" size="sm">
              <WandSparkles className="h-4 w-4" />
              Format
            </Button>
            <Button variant="ghost" size="sm">
              Analyze
            </Button>
            <Button variant="emerald" size="sm">
              <WandSparkles className="h-4 w-4" />
              Optimize
            </Button>
            <div className="w-px h-5 bg-charcoal-800 mx-1" />
            <Button variant="ghost" size="icon-sm">
              <FileDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm">
              <FileUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className={cn("h-4 w-4", showSettings && "text-emerald-400")} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 px-4 border-b border-charcoal-800/50 bg-charcoal-900/20">
          <button
            onClick={() => setActiveTab("edit")}
            className={cn(
              "px-4 py-2 text-sm border-b-2 transition-all",
              activeTab === "edit"
                ? "border-emerald-400 text-charcoal-200"
                : "border-transparent text-charcoal-600 hover:text-charcoal-400"
            )}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "px-4 py-2 text-sm border-b-2 transition-all",
              activeTab === "preview"
                ? "border-emerald-400 text-charcoal-200"
                : "border-transparent text-charcoal-600 hover:text-charcoal-400"
            )}
          >
            Preview
          </button>
        </div>

        {/* Editor Body */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative overflow-auto bg-charcoal-950/50">
            {activeTab === "edit" ? (
              <div className="flex h-full">
                {renderLineNumbers()}
                <div className="relative flex-1">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setSaved(false);
                    }}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      "absolute inset-0 w-full h-full resize-none bg-transparent text-sm leading-6 font-mono text-transparent caret-charcoal-100 py-4 outline-none",
                      !wordWrap && "overflow-x-auto whitespace-nowrap"
                    )}
                    spellCheck={false}
                    style={{ caretColor: "#e4e5e7" }}
                  />
                  <div
                    className={cn(
                      "pointer-events-none",
                      !wordWrap && "whitespace-nowrap"
                    )}
                  >
                    {renderHighlightedContent()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="prose prose-invert max-w-none">
                  <div className="text-sm text-charcoal-200 whitespace-pre-wrap font-mono leading-6">
                    {content.replace(/\{\{(.*?)\}\}/g, (_, varName) => {
                      const v = sampleVariables.find((v) => v.name === varName.trim());
                      return v ? v.defaultValue : `[${varName.trim()}]`;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="w-64 border-l border-charcoal-800/50 bg-charcoal-900/30 p-4 overflow-y-auto">
              <h3 className="text-sm font-semibold text-charcoal-200 mb-4">Editor Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-charcoal-400">Line Numbers</span>
                  <button
                    onClick={() => setLineNumbers(!lineNumbers)}
                    className={cn(
                      "h-5 w-9 rounded-full transition-colors",
                      lineNumbers ? "bg-emerald-500" : "bg-charcoal-700"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded-full bg-white transition-transform mt-0.5",
                      lineNumbers ? "translate-x-[18px]" : "translate-x-[2px]"
                    )} />
                  </button>
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-charcoal-400">Word Wrap</span>
                  <button
                    onClick={() => setWordWrap(!wordWrap)}
                    className={cn(
                      "h-5 w-9 rounded-full transition-colors",
                      wordWrap ? "bg-emerald-500" : "bg-charcoal-700"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded-full bg-white transition-transform mt-0.5",
                      wordWrap ? "translate-x-[18px]" : "translate-x-[2px]"
                    )} />
                  </button>
                </label>
                <div>
                  <p className="text-sm text-charcoal-400 mb-2">Font Size</p>
                  <div className="flex items-center gap-2">
                    {[12, 13, 14, 15, 16].map((size) => (
                      <button
                        key={size}
                        className={cn(
                          "px-2 py-1 text-xs rounded transition-all",
                          size === 14
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "text-charcoal-500 hover:text-charcoal-300"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-charcoal-400 mb-2">Tab Size</p>
                  <div className="flex items-center gap-2">
                    {[2, 4, 8].map((size) => (
                      <button
                        key={size}
                        className={cn(
                          "px-3 py-1 text-xs rounded transition-all",
                          size === 2
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "text-charcoal-500 hover:text-charcoal-300"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-charcoal-800/50 bg-charcoal-900/30 text-xs text-charcoal-600">
          <div className="flex items-center gap-4">
            <span>Ln {lines.length}</span>
            <span>Col {content.length}</span>
            <span>Words {content.split(/\s+/).filter(Boolean).length}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>UTF-8</span>
            <span>Spaces: 2</span>
            {saveError && <span className="text-red-400">{saveError}</span>}
            <span>{saved ? "Saved" : "Unsaved"}</span>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Variables / History */}
      <div className="w-72 border-l border-charcoal-800/50 bg-charcoal-900/30 flex flex-col">
        {/* Sidebar Tabs */}
        <div className="flex border-b border-charcoal-800/50">
          <button
            onClick={() => { setShowVariables(true); setShowHistory(false); }}
            className={cn(
              "flex-1 px-4 py-2.5 text-xs font-medium border-b-2 transition-all",
              showVariables ? "border-emerald-400 text-charcoal-200" : "border-transparent text-charcoal-600 hover:text-charcoal-400"
            )}
          >
            <Variable className="h-3.5 w-3.5 inline mr-1.5" />
            Variables
          </button>
          <button
            onClick={() => { setShowVariables(false); setShowHistory(true); }}
            className={cn(
              "flex-1 px-4 py-2.5 text-xs font-medium border-b-2 transition-all",
              showHistory ? "border-emerald-400 text-charcoal-200" : "border-transparent text-charcoal-600 hover:text-charcoal-400"
            )}
          >
            <History className="h-3.5 w-3.5 inline mr-1.5" />
            History
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {showVariables && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-charcoal-500">{sampleVariables.length} variables</span>
                <Button variant="ghost" size="xs">
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
              {sampleVariables.map((v) => (
                <div key={v.name} className="p-2.5 rounded-lg bg-charcoal-800/30 border border-charcoal-800/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-emerald-400">&#123;&#123;{v.name}&#125;&#125;</span>
                    <Badge variant={v.required ? "emerald" : "default"} size="sm">
                      {v.required ? "Required" : "Optional"}
                    </Badge>
                  </div>
                  <p className="text-xs text-charcoal-500 mb-2">{v.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" size="sm">{v.type}</Badge>
                    <span className="text-xs text-charcoal-600">
                      Default: <span className="text-charcoal-400">{v.defaultValue}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showHistory && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-charcoal-500">{sampleVersions.length} versions</span>
                <Button variant="ghost" size="xs">
                  <Save className="h-3 w-3" />
                  Save Version
                </Button>
              </div>
              {sampleVersions.map((ver) => (
                <div key={ver.id} className="p-2.5 rounded-lg bg-charcoal-800/30 border border-charcoal-800/50 cursor-pointer hover:border-charcoal-700 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-charcoal-200">v{ver.version}</span>
                    <span className="text-xs text-charcoal-600">{ver.createdAt}</span>
                  </div>
                  <p className="text-xs text-charcoal-500">{ver.changelog}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
