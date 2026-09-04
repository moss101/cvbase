/**
 * Cross-platform "give the user this file" primitive.
 *
 * On the web, an `<a download>` click is the standard way to hand a Blob to
 * the user. Inside a Capacitor WebView there is no download manager to catch
 * that click — the anchor is either a silent no-op or opens the blob: URL as
 * a dead-end in-app navigation, so native export has been broken. Native
 * instead writes the file into the app's cache directory and hands it to the
 * OS share sheet (AirDrop, "Save to Files", Gmail, ...), which is the closest
 * native equivalent of "download this". If the share sheet itself can't be
 * reached (plugin missing, OS refuses), the fallback writes into the
 * Documents directory and tells the user where to find it via a toast.
 */
import { Capacitor } from '@capacitor/core';
import { toastBus } from '../../components/common/Toast';
import { captureException } from '../monitoring';

export type SaveFileResult = 'downloaded' | 'shared' | 'saved';

export interface SaveFileOptions {
    blob: Blob;
    /** Suggested file name, including extension (e.g. "Jane_Doe_Resume.pdf"). */
    filename: string;
    mimeType: string;
}

/** Blob -> base64 payload (no `data:` prefix), as required by @capacitor/filesystem. */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                reject(new Error('Could not read file as base64'));
                return;
            }
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsDataURL(blob);
    });
}

function downloadInBrowser(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    try {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } finally {
        // Revoke on a delay: some browsers (notably Safari) abort the
        // download if the object URL is revoked synchronously after click().
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

async function saveNative(blob: Blob, filename: string, mimeType: string): Promise<SaveFileResult> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const data = await blobToBase64(blob);

    try {
        const written = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
        try {
            const { Share } = await import('@capacitor/share');
            await Share.share({ title: filename, url: written.uri });
            return 'shared';
        } catch (shareErr) {
            // Sharing didn't work (no share target, plugin unavailable, user's OS
            // declined) — fall through to the Documents fallback below rather
            // than leaving the user with nothing.
            captureException(shareErr, { context: 'saveFile:share', filename, mimeType });
        }
    } catch (writeErr) {
        captureException(writeErr, { context: 'saveFile:writeCache', filename, mimeType });
    }

    // Fallback: a persistent, user-visible location plus a toast telling them
    // where to look, since there is no share sheet confirmation to rely on.
    await Filesystem.writeFile({ path: filename, data, directory: Directory.Documents });
    toastBus.emit({
        title: 'Saved to Documents',
        description: filename,
        variant: 'success',
    });
    return 'saved';
}

/**
 * Save `blob` for the user, using whichever mechanism the current platform
 * actually supports. Never throws for a share-sheet decline; only throws if
 * even the Documents fallback write fails.
 */
export async function saveFile({ blob, filename, mimeType }: SaveFileOptions): Promise<SaveFileResult> {
    if (!Capacitor.isNativePlatform()) {
        downloadInBrowser(blob, filename);
        return 'downloaded';
    }
    return saveNative(blob, filename, mimeType);
}
