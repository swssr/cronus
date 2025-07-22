import { invoke } from "@tauri-apps/api/core";
import { Commit } from "../types";

export async function getGitHistoryWithContent(filePath: string): Promise<Commit[]> {
  try {
    const raw = await invoke<string>("get_git_history", { filePath });
    const history = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, date, message] = line.split("|");
        return { hash, author, date, message };
      });

    const withContent: Commit[] = [];
    for (const entry of history) {
      try {
        const content = await invoke<string>("get_git_file_at_commit", {
          filePath,
          commitHash: entry.hash,
        });
        withContent.push({ ...entry, content });
      } catch (e) {
        console.error(`Could not fetch content for ${entry.hash}`, e);
        withContent.push({
          ...entry,
          content: "// Error loading file content",
        });
      }
    }

    return withContent;
  } catch (error) {
    console.error("Error loading history", error);
    return [];
  }
}


export async function getDirectoryFiles(dirPath: string): Promise<string[]> {
    try {
      const files = await invoke<string[]>("list_directory_files", { dirPath });
      return files;
    } catch (error) {
      console.error("Error listing directory files", error);
      return [];
    }
  }
  
  export function getFileLanguage(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      rs: "rust",
      go: "go",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      php: "php",
      rb: "ruby",
      swift: "swift",
      kt: "kotlin",
      scala: "scala",
      sh: "shell",
      bash: "shell",
      zsh: "shell",
      fish: "shell",
      ps1: "powershell",
      sql: "sql",
      html: "html",
      css: "css",
      scss: "scss",
      sass: "sass",
      less: "less",
      xml: "xml",
      json: "json",
      yaml: "yaml",
      yml: "yaml",
      toml: "toml",
      ini: "ini",
      cfg: "ini",
      conf: "ini",
      md: "markdown",
      markdown: "markdown",
      dockerfile: "dockerfile",
      makefile: "makefile",
      r: "r",
      dart: "dart",
      lua: "lua",
      vim: "vim",
      tex: "latex",
    };
    return langMap[ext || ""] || "plaintext";
  }
  
  export function getFileIcon(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      // Programming languages
      ts: "🟦", tsx: "🟦", js: "🟨", jsx: "🟨",
      py: "🐍", rs: "🦀", go: "🐹", java: "☕",
      cpp: "⚡", c: "⚡", cs: "🟣", php: "🐘",
      rb: "💎", swift: "🦉", kt: "🟠", scala: "🔴",
      
      // Web
      html: "🌐", css: "🎨", scss: "🎨", sass: "🎨",
      
      // Data
      json: "📋", yaml: "📋", yml: "📋", xml: "📋",
      csv: "📊", sql: "🗄️",
      
      // Documentation
      md: "📝", txt: "📄", pdf: "📕",
      
      // Config
      toml: "⚙️", ini: "⚙️", cfg: "⚙️", conf: "⚙️",
      
      // Shell
      sh: "🐚", bash: "🐚", zsh: "🐚", fish: "🐚",
      
      // Others
      dockerfile: "🐳", makefile: "🔨",
      gitignore: "🚫", license: "📜",
    };
    
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('readme')) return "📖";
    if (lowerName.includes('license')) return "📜";
    if (lowerName.includes('dockerfile')) return "🐳";
    if (lowerName.includes('makefile')) return "🔨";
    if (lowerName.includes('.git')) return "🔧";
    
    return iconMap[ext || ""] || "📄";
  }
  
  export function getFileCategory(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const lowerName = fileName.toLowerCase();
    
    // Special files
    if (lowerName.includes('readme') || lowerName.includes('license') || ext === 'md') {
      return "Documentation";
    }
    
    // Config files
    if (['json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf'].includes(ext || '') ||
        lowerName.includes('config') || lowerName.includes('.env') ||
        lowerName.includes('dockerfile') || lowerName.includes('makefile')) {
      return "Configuration";
    }
    
    // Programming languages
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'swift', 'kt', 'scala'].includes(ext || '')) {
      return "Source Code";
    }
    
    // Web files
    if (['html', 'css', 'scss', 'sass', 'less'].includes(ext || '')) {
      return "Web";
    }
    
    // Shell scripts
    if (['sh', 'bash', 'zsh', 'fish', 'ps1'].includes(ext || '')) {
      return "Scripts";
    }
    
    // Data files
    if (['sql', 'csv', 'xml'].includes(ext || '')) {
      return "Data";
    }
    
    return "Other";
  }
  
  export function organizeFiles(files: string[]): Record<string, string[]> {
    const organized: Record<string, string[]> = {};
    
    files.forEach(file => {
      const category = getFileCategory(file);
      if (!organized[category]) {
        organized[category] = [];
      }
      organized[category].push(file);
    });
    
    // Sort files within each category
    Object.keys(organized).forEach(category => {
      organized[category].sort();
    });
    
    return organized;
  }