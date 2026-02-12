import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processFile } from './lib/processor';
import crypto from 'crypto';
import { exec, execFile } from 'child_process';
import helmet from 'helmet';

const logger = {
  info: (msg: string) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  error: (msg: string, err?: unknown) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, err),
};

async function saveImageSlice(buffer: Buffer, uploadDir: string): Promise<string> {
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
  const filePath = path.join(uploadDir, fileName);
  await fs.promises.writeFile(filePath, buffer);
  return `/uploads/${fileName}`;
}

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Input Validation Helpers
const isValidFilename = (name: string) => !/[\\/:\*\?"<>|]/.test(name) && !/\.\./.test(name);
const isValidId = (id: string) => /^[a-zA-Z0-9_-]+$/.test(id);
const isSafePath = (p: string) => !path.normalize(p).includes('..');

// Configure Multer with limit from env
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(express.json({ limit: '50mb' }));

// Server-side Folder Picker (Windows only)
app.get('/api/pick-folder', (_req, res) => {
  if (process.platform !== 'win32') {
    return res.status(400).json({ error: 'Folder picker is only supported on Windows server hosting.' });
  }

  const psCommand = `
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
    Add-Type -AssemblyName System.Windows.Forms;
    $f = New-Object System.Windows.Forms.FolderBrowserDialog;
    $f.ShowNewFolderButton = $true;
    if ($f.ShowDialog() -eq 'OK') { Write-Host $f.SelectedPath }
  `;

  exec(`powershell -nop -c "${psCommand.replace(/\n/g, ' ')}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('[API] Folder picker error:', stderr || error.message);
      return res.status(500).json({ error: 'Failed to open folder picker' });
    }
    const selectedPath = stdout.trim();
    if (selectedPath) {
      res.json({ path: selectedPath });
    } else {
      res.json({ canceled: true });
    }
  });
});

// Open Folder in Explorer
app.post('/api/open-folder', (req, res) => {
  const { path: folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'Path is required' });

  // Windows specific - Safe execution
  execFile('explorer.exe', [folderPath], (error) => {
    if (error) {
      logger.error('Failed to open folder:', error);
      return res.status(500).json({ error: 'Failed to open folder' });
    }
    res.json({ success: true });
  });
});

// API Endpoints
app.post('/api/upload', upload.single('file'), async (req, res) => {

  try {
    if (!req.file) {

      return res.status(400).json({ error: 'No file uploaded' });
    }
    

    const { sliceHeight } = req.body;
    const height = sliceHeight ? parseInt(sliceHeight) : 0; // Default to 0 (no slice)

    console.log('[API] processing file...');
    const { blocks } = await processFile(req.file.path, req.file.mimetype, height);
    console.log(`[API] processFile returned ${blocks.length} blocks`);
    
    // Cleanup uploaded temp file
    try {
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    } catch (cleanupError) {
        console.error('[API] Warning: Failed to delete temp file:', cleanupError);
    }

    // Save image slices to public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    }

    console.log('[API] Saving images...');
    let savedCount = 0;
    const processedBlocks = await Promise.all(blocks.map(async (block, idx) => {
       // console.log(`[API] Saving block ${idx}...`); 
       if (block.type === 'image' && block.buffer) {
           const imageUrl = await saveImageSlice(block.buffer, uploadDir);
           savedCount++;
           if (savedCount % 10 === 0) console.log(`[API] Saved ${savedCount} images...`);
           return {
               type: 'image',
               src: imageUrl,
               links: block.links,
               width: block.width,
               height: block.height
           };
       } else {
           return {
               type: 'text',
               content: block.content,
               // links might be embedded in HTML
           };
       }
    }));

    // Legacy support: if pure images, return them as images list too?
    // Frontend expects { slices } or now { blocks }
    
    console.log('[API] All blocks processed. Sending response.');
    res.json({ 
        blocks: processedBlocks
    });
  } catch (error) {
    logger.error('Error processing file:', error);
    
    // Attempt cleanup on error too
    if (req.file && fs.existsSync(req.file.path)) {
        try { await fs.promises.unlink(req.file.path); } catch { /* empty */ }
    }

    res.status(500).json({ error: 'Failed to process file', details: error instanceof Error ? error.message : String(error) });
  }
});

// Newsletter Storage Endpoints
const DATA_DIR = path.join(process.cwd(), 'server', 'data', 'newsletters');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// List all newsletters
app.get('/api/newsletters', async (_req, res) => {
  try {
    const files = (await fs.promises.readdir(DATA_DIR)).filter(f => f.endsWith('.json'));
    const newsletters = await Promise.all(files.map(async (file) => {
      const content = JSON.parse(await fs.promises.readFile(path.join(DATA_DIR, file), 'utf-8'));
      return {
        id: content.id,
        title: content.title,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt
      };
    }));
    newsletters.sort((a, b) => b.updatedAt - a.updatedAt);
    
    res.json(newsletters);
  } catch (error) {
    logger.error('Error listing newsletters:', error);
    res.status(500).json({ error: 'Failed to list newsletters' });
  }
});

// Get specific newsletter
app.get('/api/newsletters/:id', async (req, res) => {
  if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
  }
  try {
    const filePath = path.join(DATA_DIR, `${req.params.id}.json`);
    try {
        const content = JSON.parse(await fs.promises.readFile(filePath, 'utf-8'));
        res.json(content);
    } catch {
        return res.status(404).json({ error: 'Newsletter not found' });
    }
  } catch (error) {
    logger.error(`Error reading newsletter ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to read newsletter' });
  }
});

// Delete newsletter
app.delete('/api/newsletters/:id', async (req, res) => {
  if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
  }
  try {
    const filePath = path.join(DATA_DIR, `${req.params.id}.json`);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Newsletter not found' });
    }
  } catch (error) {
    logger.error(`Error deleting newsletter ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete newsletter' });
  }
});

// Save newsletter
app.post('/api/newsletters', async (req, res) => {
  try {
    const { id, title, blocks } = req.body;
    
    if (!blocks) {
        return res.status(400).json({ error: 'Missing blocks data' });
    }

    const newsletterId = id || crypto.randomUUID();
    const now = Date.now();
    
    const newsletter = {
      id: newsletterId,
      title: title || 'Untitled Newsletter',
      createdAt: id ? undefined : now,
      updatedAt: now,
      blocks
    };

    // If updating, try to preserve createdAt
    const filePath = path.join(DATA_DIR, `${newsletterId}.json`);
    if (fs.existsSync(filePath)) {
        try {
            const existing = JSON.parse(await fs.promises.readFile(filePath, 'utf-8'));
            newsletter.createdAt = existing.createdAt || now;
        } catch { /* empty */ }
    } else {
        newsletter.createdAt = now;
    }

    await fs.promises.writeFile(filePath, JSON.stringify(newsletter, null, 2));
    

    res.json({ success: true, id: newsletterId, newsletter });
  } catch (error) {
    logger.error('Error saving newsletter:', error);
    res.status(500).json({ error: 'Failed to save newsletter' });
  }
});

// Settings & Export Endpoints (Restoring missing endpoints)
const DATA_FILE = path.join(process.cwd(), 'server', 'data', 'settings.json');

app.get('/api/settings', async (_req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const settings = JSON.parse(await fs.promises.readFile(DATA_FILE, 'utf-8'));
      res.json(settings);
    } else {
      res.json({ exportPath: '' });
    }
  } catch (error) {
    logger.error('Failed to load settings', error);
    res.json({ exportPath: '' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { exportPath } = req.body;
    
    if (exportPath && !isSafePath(exportPath)) {
        return res.status(400).json({ error: 'Invalid export path' });
    }

    await fs.promises.writeFile(DATA_FILE, JSON.stringify({ exportPath }, null, 2));
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to save settings', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Image to Base64 API for HTML export
app.get('/api/image-base64', async (req, res) => {
  const { path: imagePath } = req.query;
  if (!imagePath || typeof imagePath !== 'string') {
    return res.status(400).json({ error: 'Path required' });
  }

  // Security: Prevent Path Traversal
  // Strip leading slash/backslash to treat as relative path
  const cleanPath = imagePath.replace(/^[/\\]/, '');
  const normalizedPath = path.normalize(cleanPath);
  if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
      logger.error(`Blocked attempted path traversal: ${imagePath}`);
      return res.status(403).json({ error: 'Invalid path' });
  }

  const fullPath = path.join(process.cwd(), 'public', normalizedPath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  try {
    const buffer = await fs.promises.readFile(fullPath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(imagePath).slice(1).toLowerCase() || 'png';
    const mimeType = ext === 'jpg' ? 'jpeg' : ext;

    res.json({ dataUri: `data:image/${mimeType};base64,${base64}` });
  } catch (e) {
    logger.error('Failed to read image', e);
    res.status(500).json({ error: 'Failed to read image' });
  }
});

app.post('/api/export', async (req, res) => {
  try {
    const { html, path: exportPath, filename } = req.body;
    if (!html || !exportPath || !filename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!isValidFilename(filename)) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    if (!isSafePath(exportPath)) {
        return res.status(400).json({ error: 'Invalid export path' });
    }

    // Basic validation of export path (simple check)
    // In a real app we might want to strictly allow only certain directories
    
    if (!fs.existsSync(exportPath)) {
      await fs.promises.mkdir(exportPath, { recursive: true });
    }

    const fullPath = path.join(exportPath, filename);
    await fs.promises.writeFile(fullPath, html, 'utf-8');
    
    res.json({ success: true, path: fullPath });
  } catch (error) {
    logger.error('Export failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to export file' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
  
  // Keep process alive hack (if event loop is draining)
  setInterval(() => {}, 1000 * 60 * 60);
});

// Log exit reasons
process.on('exit', (code) => {
    console.log(`[API] Server process exiting with code: ${code}`);
});

process.on('uncaughtException', (err) => {
    console.error('[API] Uncaught Exception:', err);
});
