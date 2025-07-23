import { Editor } from "@monaco-editor/react";
import { Commit } from "../types";
import { getFileLanguage } from "../utils";

export function CarouselCard({ commit, index }: { commit: Commit; index: number }) {
    const fileName = commit.content ? "file" : "file";
    const language = getFileLanguage(fileName);

    return (
      <div className={`carousel-card gradient-${(index % 3) + 1}`}>
        <div className="card-header">
          <div className="commit-info">
            <code className="commit-hash">{commit.hash.slice(0, 8)}</code>
            <span className="commit-author">{commit.author}</span>
            <span className="commit-date">{commit.date}</span>
          </div>
          <div className="commit-message">{commit.message}</div>
        </div>
        
        <div className="card-content">
          <Editor
            height="400px"
            language={language}
            value={commit.content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "off",
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              scrollbar: { vertical: 'auto', horizontal: 'auto' },
              folding: false,
              glyphMargin: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 0,
              overviewRulerLanes: 0,
            }}
          />
        </div>
      </div>
    );
  }