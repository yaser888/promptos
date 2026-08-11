import { Header } from "@/components/layout/header";
import { PromptEditor } from "@/components/editor/prompt-editor";

export default function EditorPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <div className="pt-16">
        <PromptEditor />
      </div>
    </div>
  );
}
