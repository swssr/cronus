import { 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileArchive,
  FilePdf,
  FileJs,
  FileTs,
  FilePy,
  FileSql,
  FileMd,
  FileTxt
} from '@phosphor-icons/react';

interface FileIconProps {
  fileName: string;
  size?: number;
  className?: string;
}

export function FileIcon({ fileName, size = 16, className = '' }: FileIconProps) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  // Extensions
  const iconMap: Record<string, React.ComponentType<any>> = {
    ts: FileTs,
    tsx: FileTs,
    js: FileJs,
    jsx: FileJs,
    py: FilePy,
    sql: FileSql,
    md: FileMd,
    txt: FileTxt,
    pdf: FilePdf,
    jpg: FileImage,
    jpeg: FileImage,
    png: FileImage,
    gif: FileImage,
    svg: FileImage,
    webp: FileImage,
    avi: FileVideo,
    mp4: FileVideo,
    mov: FileVideo,
    wmv: FileVideo,
    flv: FileVideo,
    webm: FileVideo,
    mp3: FileAudio,
    wav: FileAudio,
    flac: FileAudio,
    aac: FileAudio,
    zip: FileArchive,
    rar: FileArchive,
    tar: FileArchive,
    gz: FileArchive,
    bz2: FileArchive,
    '7z': FileArchive,
  };

  const IconComponent = iconMap[ext || ""] || FileText;
  return <IconComponent size={size} className={className} weight="duotone" />;
} 