import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processFile } from './lib/processor';
import crypto from 'crypto';
import { exec } from 'child_process';

const app = express();
const port = 3000;

// Configure Multer with 50MB limit
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

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

  // Windows specific
  const command = `start "" "${folderPath}"`;
  
  exec(command, (error) => {
    if (error) {
      console.error('Failed to open folder:', error);
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

    const { slices } = await processFile(req.file.path, req.file.mimetype, height);
    
    // Cleanup uploaded temp file
    try {
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    } catch (cleanupError) {
        console.error('[API] Warning: Failed to delete temp file:', cleanupError);
    }

    // Save slices to public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const imageUrls = slices.map(slice => {
      const buf = slice.buffer;
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buf);
      return `/uploads/${fileName}`;
    });


    
    // Also generate HTML for preview/export if needed, but the client currently requests HTML generation?
    // Wait, the client usually requests HTML generation separately or constructs it?
    // Looking at the code, /api/upload just returns images.
    // The client probably calls another endpoint or constructs HTML itself?
    // Ah, wait. `processFile` imports `generateHtml` but doesn't seem to use it in the return value of `processFile`?
    // `processFile` returns `{ slices }`.
    
    // If the client constructs HTML, IT DOES NOT KNOW ABOUT LINKS.
    // I need to return link info to the client OR generate HTML validation.
    
    // The user request says: "PDF를 이미지로 변환하면서 ... 이미지 위에 클릭 가능한 링크 영역을 오버레이"
    // "3단계: html-generator.ts 수정 ... 각 이미지를 ... 감싸기"
    
    // If the client is just getting images, it won't get the HTML with links.
    // Let's check how the client uses this.
    // If the client is a React app that receives images and rebuilds the preview... 
    // The client code isn't in my view, but `api/upload` returns `{ images: strings[] }`.
    
    // Usage: `const { images } = await processFile(...)`.
    
    // If I want the "Generated HTML" to have links, I probably need to return the HTML or the link data.
    // The USER REQUEST implementation plan says: `4단계: API 응답 수정 ... 필요시 API 응답에 링크 정보 포함`
    
    // Only returning images means the Frontend won't know about links unless I return them.
    // OR, I should generate the HTML on the server and return it?
    // But `api/upload` returns `images`.
    
    // Attempt 1: Return links data in the response so frontend can use it?
    // Attempt 2: Return a generated HTML string as well?
    
    // Let's look at `server/lib/html-generator.ts`. It exports `generateHtml`.
    // Who uses `generateHtml`?
    // `server/lib/processor.ts` imports it but doesn't use it?
    // `server/index.ts` doesn't import it.
    
    // Wait, if `generateHtml` is not used in `index.ts`, then where is the HTML generated?
    // Maybe the user uses `generateHtml` in `processor.ts`?
    // In `processor.ts`, I see `import { generateHtml } from './html-generator';` but it is UNUSED in the generic `processFile`.
    
    // Let's check if there is another endpoint for generating HTML?
    // `app.post('/api/export', ...)` takes `html` in body.
    
    // It seems the frontend generates the HTML?
    // If so, I MUST return the link info to the frontend.
    // AND I must update the frontend to use this link info to generate the HTML.
    
    // BUT the user plan says: "3단계: html-generator.ts 수정 ... 각 이미지를 ... 감싸기" which implies `html-generator.ts` is responsible.
    // If `html-generator.ts` is used by the frontend (shared code?), then updating it is fine.
    // But `server/lib/html-generator.ts` suggests it is server-side.
    
    // If existing `html-generator.ts` is server-side and `api/upload` only returns images, then the current flow might be:
    // Upload -> Server returns images -> Frontend displays images.
    // Export -> Frontend sends HTML -> Server saves it.
    
    // If so, the Frontend generates the HTML.
    // So modifying `server/lib/html-generator.ts` is only useful if:
    // 1. The server generates HTML (e.g. for email attachment or zip).
    // 2. Or the user wants me to change the flow so Server returns HTML.
    
    // Let's assume I should return `links` in `/api/upload` respose, AND potentially return the generated HTML if the user wants purely server-side generation.
    // But `task.md` says "Modify server/lib/html-generator.ts".
    
    // Let's verify if `html-generator.ts` is used anywhere else.
    // I can use `grep_search` to find usages of `generateHtml`.
    
    // For now, I will update `index.ts` to return `links` structure as well.
    // And `html-generator.ts` is already updated.
    
    // Let's modify `index.ts` to return:
    // { 
    //   images: string[], 
    //   processedSlices: { imageUrl: string, links: LinkInfo[] }[] 
    // }
    // This gives flexibility.
    
    const processedSlices = slices.map(slice => {
      const buf = slice.buffer;
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buf);
      const imageUrl = `/uploads/${fileName}`;
      return {
          imageUrl,
          links: slice.links
      };
    });
    
    const imagesList = processedSlices.map(s => s.imageUrl);

    res.json({ 
        images: imagesList,
        slices: processedSlices // New field with metadata
    });
  } catch (error) {
    console.error('[API] Error processing file:', error);
    if (error instanceof Error) {
        console.error(error.stack);
    }
    
    // Attempt cleanup on error too
    if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
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
app.get('/api/newsletters', (_req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const newsletters = files.map(file => {
      const content = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
      return {
        id: content.id,
        title: content.title,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt
      };
    }).sort((a, b) => b.updatedAt - a.updatedAt);
    
    res.json(newsletters);
  } catch (error) {
    console.error('[API] Error listing newsletters:', error);
    res.status(500).json({ error: 'Failed to list newsletters' });
  }
});

// Get specific newsletter
app.get('/api/newsletters/:id', (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Newsletter not found' });
    }
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(content);
  } catch (error) {
    console.error(`[API] Error reading newsletter ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to read newsletter' });
  }
});

// Delete newsletter
app.delete('/api/newsletters/:id', (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, `${req.params.id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Newsletter not found' });
    }
  } catch (error) {
    console.error(`[API] Error deleting newsletter ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete newsletter' });
  }
});

// Save newsletter
app.post('/api/newsletters', (req, res) => {
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
      createdAt: id ? undefined : now, // Keep original creation date if updating? Actually we just overwrite for now or read from file
      updatedAt: now,
      blocks
    };

    // If updating, try to preserve createdAt
    const filePath = path.join(DATA_DIR, `${newsletterId}.json`);
    if (fs.existsSync(filePath)) {
        const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        newsletter.createdAt = existing.createdAt || now;
    } else {
        newsletter.createdAt = now;
    }

    fs.writeFileSync(filePath, JSON.stringify(newsletter, null, 2));
    

    res.json({ success: true, id: newsletterId, newsletter });
  } catch (error) {
    console.error('[API] Error saving newsletter:', error);
    res.status(500).json({ error: 'Failed to save newsletter' });
  }
});

// Settings & Export Endpoints (Restoring missing endpoints)
const DATA_FILE = path.join(process.cwd(), 'server', 'data', 'settings.json');

app.get('/api/settings', (_req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const settings = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      res.json(settings);
    } else {
      res.json({ exportPath: '' });
    }
  } catch (error) {
    console.error('Failed to load settings', error);
    res.json({ exportPath: '' });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { exportPath } = req.body;
    fs.writeFileSync(DATA_FILE, JSON.stringify({ exportPath }, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save settings', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Image to Base64 API for HTML export
app.get('/api/image-base64', (req, res) => {
  const { path: imagePath } = req.query;
  if (!imagePath || typeof imagePath !== 'string') {
    return res.status(400).json({ error: 'Path required' });
  }

  const fullPath = path.join(process.cwd(), 'public', imagePath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const buffer = fs.readFileSync(fullPath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(imagePath).slice(1).toLowerCase() || 'png';
  const mimeType = ext === 'jpg' ? 'jpeg' : ext;

  res.json({ dataUri: `data:image/${mimeType};base64,${base64}` });
});

app.post('/api/export', (req, res) => {
  try {
    const { html, path: exportPath, filename } = req.body;
    if (!html || !exportPath || !filename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, { recursive: true });
    }

    const fullPath = path.join(exportPath, filename);
    fs.writeFileSync(fullPath, html, 'utf-8');
    

    res.json({ success: true, path: fullPath });
  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ error: error.message || 'Failed to export file' });
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
process.on('SIGINT', () => {
    console.log('[API] Server received SIGINT');
    process.exit(0);
});
process.on('uncaughtException', (err) => {
    console.error('[API] Uncaught Exception:', err);
});
