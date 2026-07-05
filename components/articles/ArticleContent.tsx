import type { ReactNode } from 'react';
import { cn } from './cn';

interface ArticleContentProps {
  content: string;
  className?: string;
}

export function ArticleContent({ content, className }: ArticleContentProps) {
  const renderContent = (markdown: string) => {
    const lines = markdown.trim().split('\n');
    const elements: ReactNode[] = [];
    let currentList: string[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={elements.length} className="list-disc list-inside space-y-2 my-4 text-foreground-muted">
            {currentList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeContent.length > 0) {
        elements.push(
          <pre key={elements.length} className="my-4 p-4 rounded-xl bg-[rgba(65,90,77,0.05)] border border-[rgba(65,90,77,0.12)] overflow-x-auto">
            <code className="text-sm text-foreground-muted font-mono">
              {codeContent.join('\n')}
            </code>
          </pre>
        );
        codeContent = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      if (line.trim() === '') {
        flushList();
        continue;
      }

      if (line.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={elements.length} className="text-3xl font-bold text-foreground mt-8 mb-4">
            {line.slice(2)}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={elements.length} className="text-2xl font-bold text-foreground mt-8 mb-4">
            {line.slice(3)}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={elements.length} className="text-xl font-semibold text-foreground mt-6 mb-3">
            {line.slice(4)}
          </h3>
        );
        continue;
      }

      if (line.startsWith('> ')) {
        flushList();
        elements.push(
          <blockquote
            key={elements.length}
            className="my-4 pl-4 border-l-4 border-primary/50 text-foreground-muted italic"
          >
            {line.slice(2)}
          </blockquote>
        );
        continue;
      }

      if (line.startsWith('- ') || line.startsWith('* ')) {
        currentList.push(line.slice(2));
        continue;
      }

      if (/^\d+\.\s/.test(line)) {
        currentList.push(line.replace(/^\d+\.\s/, ''));
        continue;
      }

      if (line.startsWith('- ✅') || line.startsWith('- ❌')) {
        currentList.push(line.slice(2));
        continue;
      }

      if (line.startsWith('|')) {
        flushList();
        elements.push(
          <div key={elements.length} className="my-4 overflow-x-auto">
            <div className="text-sm text-foreground-muted bg-[rgba(65,90,77,0.05)] rounded-lg p-4 font-mono">
              {line}
            </div>
          </div>
        );
        continue;
      }

      flushList();

      const processedLine = line
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-[rgba(65,90,77,0.08)] text-primary text-sm font-mono">$1</code>');

      elements.push(
        <p
          key={elements.length}
          className="text-foreground-muted leading-relaxed my-4"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    }

    flushList();
    flushCodeBlock();

    return elements;
  };

  return (
    <div className={cn('prose max-w-none', className)}>
      {renderContent(content)}
    </div>
  );
}
