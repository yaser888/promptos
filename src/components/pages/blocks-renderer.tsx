import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/utils/cn";
import type { PageBlock } from "@/engine/pages/pages.service";

function Heading({ props }: { props: Record<string, unknown> }) {
  const level = props.level === 2 || props.level === 3 ? (props.level as 2 | 3) : 1;
  const Level = `h${level}` as "h1" | "h2" | "h3";
  return (
    <Level
      className={cn(
        "font-bold text-charcoal-100",
        level === 1 && "text-4xl leading-tight",
        level === 2 && "text-3xl",
        level === 3 && "text-2xl"
      )}
    >
      {String(props.text ?? "")}
    </Level>
  );
}

function Paragraph({ props }: { props: Record<string, unknown> }) {
  return <p className="text-charcoal-300 leading-relaxed">{String(props.text ?? "")}</p>;
}

function ImageBlock({ props }: { props: Record<string, unknown> }) {
  const url = String(props.url ?? "");
  const alt = String(props.alt ?? "");
  const caption = props.caption ? String(props.caption) : null;
  return (
    <figure className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="w-full rounded-xl border border-charcoal-800 object-cover"
      />
      {caption && <figcaption className="text-sm text-charcoal-500 text-center">{caption}</figcaption>}
    </figure>
  );
}

function Button({ props }: { props: Record<string, unknown> }) {
  const href = props.href ? String(props.href) : "#";
  const style = props.style === "ghost" ? "ghost" : "solid";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors",
        style === "solid"
          ? "bg-accent text-accent-foreground hover:opacity-90"
          : "border border-charcoal-700 text-charcoal-200 hover:border-emerald-500/50"
      )}
    >
      {String(props.text ?? "")}
    </a>
  );
}

function List({ props }: { props: Record<string, unknown> }) {
  const ordered = props.ordered === true;
  const items = (props.items as unknown[]) ?? [];
  const content = (render: (item: string) => React.ReactNode) =>
    items.map((item, i) => <li key={i}>{render(String(item))}</li>);
  if (ordered) {
    return <ol className="list-decimal ps-6 space-y-1 text-charcoal-300">{content((item) => item)}</ol>;
  }
  return <ul className="list-disc ps-6 space-y-1 text-charcoal-300">{content((item) => item)}</ul>;
}

function Quote({ props }: { props: Record<string, unknown> }) {
  const author = props.author ? String(props.author) : null;
  return (
    <blockquote className="border-s-4 border-emerald-500/50 ps-4 text-charcoal-300 italic">
      {String(props.text ?? "")}
      {author && <footer className="mt-2 text-sm not-italic text-charcoal-500">— {author}</footer>}
    </blockquote>
  );
}

function Code({ props }: { props: Record<string, unknown> }) {
  const language = props.language ? String(props.language) : "";
  return (
    <pre className="overflow-x-auto rounded-xl border border-charcoal-800 bg-charcoal-950 p-4 text-sm text-emerald-300">
      {language && <code className="block text-xs text-charcoal-500 mb-2">{language}</code>}
      <code>{String(props.code ?? "")}</code>
    </pre>
  );
}

function Html({ props }: { props: Record<string, unknown> }) {
  return (
    <div
      className="dangerously-render"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(props.html ?? "")) }}
    />
  );
}

export default function BlocksRenderer({
  blocks,
  className,
}: {
  blocks: PageBlock[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-8", className)}>
      {blocks.map((block) => {
        switch (block.type) {
          case "heading":
            return <Heading key={block.id} props={block.props} />;
          case "paragraph":
            return <Paragraph key={block.id} props={block.props} />;
          case "image":
            return <ImageBlock key={block.id} props={block.props} />;
          case "button":
            return <Button key={block.id} props={block.props} />;
          case "list":
            return <List key={block.id} props={block.props} />;
          case "quote":
            return <Quote key={block.id} props={block.props} />;
          case "code":
            return <Code key={block.id} props={block.props} />;
          case "html":
            return <Html key={block.id} props={block.props} />;
          case "divider":
            return <hr key={block.id} className="border-charcoal-800" />;
          default:
            return null;
        }
      })}
    </div>
  );
}