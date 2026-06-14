import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const PFP_DIR = path.resolve('/app/pfp');

// Case-insensitive image lookup
// GET /pfp/:name  →  serves /app/pfp/<name>.<ext> regardless of case
router.get('/:name', (req, res) => {
  const requestedName = req.params.name; // e.g. "matty_playz" or "matty_playz.jpg"
  const baseName = requestedName.replace(/\.[^.]+$/, ''); // strip extension if present
  const lowerBase = baseName.toLowerCase();

  let files: string[] = [];
  try {
    files = fs.readdirSync(PFP_DIR);
  } catch {
    return res.status(404).json({ error: 'pfp directory not found' });
  }

  // Find a file whose base name matches case-insensitively
  const match = files.find((f) => {
    const fileBase = f.replace(/\.[^.]+$/, '').toLowerCase();
    return fileBase === lowerBase;
  });

  if (!match) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const filePath = path.join(PFP_DIR, match);
  const ext = path.extname(match).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(filePath);
});

export default router;
