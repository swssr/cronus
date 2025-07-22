import { invoke } from "@tauri-apps/api/core";
import { Commit } from "./types";

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

export function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      })
    };
  } catch {
    return { date: dateStr, time: '' };
  }
} 