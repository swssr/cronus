import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import Editor from "@monaco-editor/react";
import "./App.css";
import { Commit } from "./types";
import { getDirectoryFiles, getFileLanguage, getFileIcon, organizeFiles } from "./utils";
import { getGitHistoryWithContent, formatDate } from "./git-utils";
import { getVisibleCommits, getCarouselSettings, type CarouselPosition } from "./carousel-utils";

function CarouselCard({ 
  commit, 
  index, 
  position, 
  fileName,
  cardsToShow 
}: { 
  commit: Commit; 
  index: number; 
  position: CarouselPosition;
  fileName: string;
  cardsToShow: number;
}) {
  const language = getFileLanguage(fileName);
  const { date, time } = formatDate(commit.date);
  const isCenter = position === 'center';
  const settings = getCarouselSettings(cardsToShow);
  
  // Show content for all cards when there are 3 or fewer, or just center for 5
  const showContent = cardsToShow <= 3 || isCenter;

  return (
    <div 
      className={`carousel-card ${position} gradient-${(index % 3) + 1}`}
      style={{
        width: `${settings.cardWidth}px`,
      }}
    >
      <div className="card-header">
        <div className="commit-meta">
          <div className="commit-hash-row">
            <code className="commit-hash">{commit.hash.slice(0, 8)}</code>
            <div className="commit-timestamp">
              <span className="commit-date">{date}</span>
              {time && <span className="commit-time">{time}</span>}
            </div>
          </div>
          <div className="commit-author">{commit.author}</div>
        </div>
        <div className="commit-message">{commit.message}</div>
      </div>
      
      {showContent && (
        <div className="card-content">
          <Editor
            height={isCenter ? "350px" : "200px"}
            language={language}
            value={commit.content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: isCenter ? 12 : 10,
              lineNumbers: "off",
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              scrollbar: { 
                vertical: isCenter ? 'auto' : 'hidden', 
                horizontal: isCenter ? 'auto' : 'hidden' 
              },
              folding: false,
              glyphMargin: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 0,
              overviewRulerLanes: 0,
              renderWhitespace: 'none',
              renderLineHighlight: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}

function FileHistoryCarousel({ commits, fileName }: { commits: Commit[]; fileName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsToShow, setCardsToShow] = useState<1 | 3 | 5>(3);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % commits.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + commits.length) % commits.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (commits.length === 0) {
    return (
      <div className="carousel-loading">
        <div className="loading-spinner"></div>
        <p>Loading file history...</p>
      </div>
    );
  }

  const visibleCommits = getVisibleCommits(commits, currentIndex, cardsToShow);
  const settings = getCarouselSettings(cardsToShow);

  return (
    <div className="carousel-container">
      <div className="carousel-header">
        <div className="file-info">
          <h2>{fileName}</h2>
          <p>{commits.length} commits • Time travel through history</p>
        </div>
        
        <div className="carousel-controls">
          <div className="view-selector">
            <button 
              className={cardsToShow === 1 ? 'active' : ''}
              onClick={() => setCardsToShow(1)}
              title="Single card view"
            >
              1
            </button>
            <button 
              className={cardsToShow === 3 ? 'active' : ''}
              onClick={() => setCardsToShow(3)}
              title="Three card view"
            >
              3
            </button>
            <button 
              className={cardsToShow === 5 ? 'active' : ''}
              onClick={() => setCardsToShow(5)}
              title="Five card view"
            >
              5
            </button>
          </div>
        </div>
      </div>

      <div className="carousel-viewport" style={{ gap: settings.gap }}>
        <button className="carousel-nav prev" onClick={prevSlide} disabled={commits.length <= 1}>
          ‹
        </button>
        
        <div className="carousel-track">
          {visibleCommits.map(({ commit, index, position }) => (
            <div key={`${index}-${position}`} className={`carousel-slide ${position}`}>
              <CarouselCard 
                commit={commit} 
                index={index} 
                position={position}
                fileName={fileName}
                cardsToShow={cardsToShow}
              />
            </div>
          ))}
        </div>
        
        <button className="carousel-nav next" onClick={nextSlide} disabled={commits.length <= 1}>
          ›
        </button>
      </div>
      
      <div className="carousel-indicators">
        <div className="timeline-dots">
          {commits.slice(0, 15).map((_, index) => (
            <button
              key={index}
              className={`timeline-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              title={`Commit ${commits[index].hash.slice(0, 8)}`}
            />
          ))}
          {commits.length > 15 && (
            <span className="dots-overflow">+{commits.length - 15}</span>
          )}
        </div>
        
        <div className="commit-counter">
          {currentIndex + 1} of {commits.length}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [directory, setDirectory] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);

  async function pickDirectory() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select a Git Repository Directory",
    });

    if (typeof selected === "string") {
      setDirectory(selected);
      const files = await getDirectoryFiles(selected);
      setAvailableFiles(files);
      setSelectedFile(null);
      setCommits([]);
    }
  }

  async function selectFile(fileName: string) {
    if (!directory) return;

    const fullPath = `${directory}/${fileName}`;
    setSelectedFile(fullPath);
    const history = await getGitHistoryWithContent(fullPath);
    setCommits(history);
  }

  const fileName = selectedFile ? selectedFile.split("/").pop() || "" : "";
  const organizedFiles = organizeFiles(availableFiles);
  const categoryOrder = ["Source Code", "Web", "Scripts", "Configuration", "Documentation", "Data", "Other"];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Cronus</h1>
        <p>git time machine</p>
      </header>

      {!directory ? (
        <div className="welcome-screen">
          <div className="welcome-content">
            <h2>Select a Repository</h2>
            <p>Choose a git repository to explore file history</p>
            <button className="pick-directory-btn" onClick={pickDirectory}>
              📁 Pick Repository
            </button>
          </div>
        </div>
      ) : !selectedFile ? (
        <div className="file-selection">
          <div className="selection-header">
            <h2>Choose a File</h2>
            <p>{availableFiles.length} files found</p>
          </div>
          
          <div className="file-categories">
            {categoryOrder.map(category => {
              if (!organizedFiles[category] || organizedFiles[category].length === 0) return null;
              
              return (
                <div key={category} className="file-category">
                  <div className="category-header">
                    <h3>{category}</h3>
                    <span className="category-count">{organizedFiles[category].length}</span>
                  </div>
                  
                  <div className="category-files">
                    {organizedFiles[category].map((file) => (
                      <button
                        key={file}
                        className="file-card"
                        onClick={() => selectFile(file)}
                      >
                        <div className="file-icon">{getFileIcon(file)}</div>
                        <div className="file-details">
                          <div className="file-name">{file.split('/').pop()}</div>
                          {file.includes('/') && (
                            <div className="file-path">{file.substring(0, file.lastIndexOf('/'))}/</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <button className="back-btn" onClick={() => setDirectory(null)}>
            ← Back to Repository Selection
          </button>
        </div>
      ) : (
        <FileHistoryCarousel commits={commits} fileName={fileName} />
      )}
    </div>
  );
}

export default App;
