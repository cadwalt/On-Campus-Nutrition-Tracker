/*
 TEMP FILE FOR THEORETICAL CHAT FILE UPLOAD FEATURE TO HANDLE USER-SUBMITTED FILES SAFELY

 * Secure upload handler (TypeScript)
 * - Enforces server-side allowlists for extensions and MIME types
 * - Sanitizes original file names and rejects suspicious names (double extensions, control chars)
 * - Detects file type from magic bytes and verifies it matches declared MIME
 * - Generates a UUID-based safe filename
 * - (Placeholder) Integrates virus-scan step (ClamAV or cloud antivirus)
 * - Uploads to Firebase Storage (or GCS) with non-executable delivery headers
 *
 * Implementation notes:
 * - Phase 1: file checks, safe names, non-executable store paths
 * - Phase 2..5: out of scope for snippet but described in comments where applicable
 */

import express, { Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import FileType from "file-type";
import sanitizeFilename from "sanitize-filename";
import admin from "firebase-admin";

// Initialize firebase-admin elsewhere in your app with proper credentials
// admin.initializeApp({ credential: admin.credential.applicationDefault(), storageBucket: 'your-bucket.appspot.com' });

const bucket = admin.storage().bucket();

// Server-side allowlists (keep minimal and strict)
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/pdf",
  "text/plain",
]);

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".pdf", ".txt"]);

// Max file size (bytes)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB - tune per your app

// Multer memory storage so we can inspect bytes before writing anywhere
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

function hasDangerousDoubleExtension(filename: string) {
  // e.g. 'avatar.jpg.php' or 'report.pdf.exe'
  const parts = filename.split(".").filter(Boolean);
  if (parts.length <= 2) return false;
  const last = `.${parts[parts.length - 1].toLowerCase()}`;
  const secondLast = `.${parts[parts.length - 2].toLowerCase()}`;
  // If second-last is a known allowed ext but there's another ext after it, suspicious
  return ALLOWED_EXT.has(secondLast) && last !== secondLast;
}

async function validateAndStoreFile(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ error: "no file uploaded" });

    const originalName = sanitizeFilename(req.file.originalname || "");
    if (!originalName) return res.status(400).json({ error: "invalid filename" });

    if (hasDangerousDoubleExtension(originalName)) {
      return res.status(400).json({ error: "filename contains multiple extensions" });
    }

    // Extract extension
    const extMatch = originalName.match(/(\.[^.\\/\\s]{1,10})$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : "";
    if (!ALLOWED_EXT.has(ext)) {
      return res.status(400).json({ error: "file extension not allowed" });
    }

    // Detect file type from bytes (magic numbers)
    const fileType = await FileType.fromBuffer(req.file.buffer);
    if (!fileType) {
      // For some plain text files file-type may return undefined; allow text/plain explicitly
      if (ext === ".txt") {
        // ok
      } else {
        return res.status(400).json({ error: "could not determine file type" });
      }
    } else {
      // Compare detected mime and extension
      if (!ALLOWED_MIME.has(fileType.mime)) {
        return res.status(400).json({ error: "MIME type not allowed" });
      }
      // Optionally require extension-to-mime consistency
      if (!fileType.ext || (`.${fileType.ext}` !== ext && !(ext === ".jpg" && fileType.ext === "jpeg"))) {
        return res.status(400).json({ error: "extension does not match file contents" });
      }
    }

    // Placeholder: run antivirus scan here (ClamAV, cloud scan) and reject if infected
    // Example: const scanResult = await scanBufferWithClamAV(req.file.buffer); if (scanResult.infected) { reject }

    // Generate safe filename (UUID + canonical extension)
    const safeFilename = `${uuidv4()}${ext}`;

    // Build a storage path outside app/server webroot and grouped by user id if available
    const userId = (req.user && (req.user as any).uid) || "anonymous"; // integrate with auth
    const remotePath = `uploads/${userId}/${safeFilename}`;

    // Upload to Firebase Storage with non-executable delivery headers
    const file = bucket.file(remotePath);
    await file.save(req.file.buffer, {
      metadata: {
        contentType: fileType ? fileType.mime : "text/plain",
        metadata: {
          // add server-side audit info
          originalName: originalName,
          uploadedBy: userId,
        },
      },
      resumable: false,
    });

    // Make sure object is served with Content-Disposition: attachment so browsers don't attempt to execute
    await file.setMetadata({
      contentDisposition: `attachment; filename="${originalName}"`,
      cacheControl: "private, max-age=0, no-transform",
    });

    // Do NOT return a direct storage path if the object is publicly accessible; instead return an opaque id or generate a short-lived signed URL
    const [signedUrl] = await file.getSignedUrl({ action: "read", expires: Date.now() + 1000 * 60 * 60 }); // 1 hour

    return res.status(201).json({ id: safeFilename, url: signedUrl });
  } catch (err) {
    console.error("upload error", err);
    return res.status(500).json({ error: "upload_failed" });
  }
}

// Express router example
export const router = express.Router();

// single file field 'file'
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  // Example server-side auth check placeholder (Phase 2 in plan)
  if (!req.user) return res.status(401).json({ error: "unauthenticated" });
  await validateAndStoreFile(req, res);
});

/*
Firebase Storage security rule snippet (add to storage.rules)

service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId; // owner-only by default
      allow write: if request.auth != null && request.auth.uid == userId && request.resource.size < 5 * 1024 * 1024;
    }
  }
}

Notes / Next steps mapping to the Implementation Plan:
- Phase 1: enforced here (allowlists, safe names, server-side checks, non-executable headers)
- Phase 2: ensure req.user is provided by hardened auth (MFA, least-privilege). Do not accept unauthenticated uploads.
- Phase 3: rotate service keys, store secrets in vault; ensure cookies/tokens use Secure+HttpOnly.
- Phase 4: add SAST/DAST, add CI checks that upload logic rejects disallowed types and scanned malware.
- Phase 5: add E2E tests and monitoring to validate behavior before prod rollback/approval.
*/

export default router;
