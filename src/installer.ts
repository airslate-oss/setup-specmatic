import fs from 'fs';

export function parseGoVersionFile(versionFilePath: string): string {
    const contents = fs.readFileSync(versionFilePath).toString();

    return contents.trim();
}
