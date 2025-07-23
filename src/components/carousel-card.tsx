import { motion } from "framer-motion";
import { Editor } from "@monaco-editor/react";
import { Commit } from "../types";
import { getFileLanguage } from "../utils";

export function CarouselCard({ commit, index }: { commit: Commit; index: number }) {
    const fileName = commit.content ? "file" : "file";
    const language = getFileLanguage(fileName);

    return (
      <motion.div 
        className={`carousel-card gradient-${(index % 3) + 1}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.4,
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        layoutId={`card-content-${index}`}
        style={{ transformOrigin: "center center" }}
      >
        <motion.div 
          className="card-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <motion.div 
            className="commit-info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <motion.code 
              className="commit-hash"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {commit.hash.slice(0, 8)}
            </motion.code>
            <motion.span 
              className="commit-author"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {commit.author}
            </motion.span>
            <motion.span 
              className="commit-date"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              {commit.date}
            </motion.span>
          </motion.div>
          <motion.div 
            className="commit-message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            {commit.message}
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="card-content"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
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
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }