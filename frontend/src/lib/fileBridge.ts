// Hands a File picked on one page to another page during client-side
// navigation (e.g. homepage dropzone -> /tools/text) without a server upload.

let pendingFile: File | null = null;

export function setPendingFile(file: File) {
    pendingFile = file;
}

export function takePendingFile(): File | null {
    const file = pendingFile;
    pendingFile = null;
    return file;
}

// Extensions the in-browser text editor can open directly.
export const TEXT_EXTENSIONS = [
    'txt', 'md', 'markdown', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
    'log', 'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'php', 'java', 'c', 'h', 'cpp', 'hpp',
    'cs', 'go', 'rs', 'swift', 'kt', 'sql', 'sh', 'bash', 'zsh', 'bat', 'ps1',
    'html', 'htm', 'css', 'scss', 'less', 'svg', 'env', 'gitignore', 'editorconfig',
    'tex', 'rtf', 'srt', 'vtt', 'tsv', 'properties', 'lock', 'dockerfile',
];

export function isTextFile(name: string): boolean {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return TEXT_EXTENSIONS.includes(ext) || !name.includes('.');
}
