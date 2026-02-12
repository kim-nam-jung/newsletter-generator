import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'server', 'data', 'newsletters');
const SETTINGS_FILE = path.join(process.cwd(), 'server', 'data', 'settings.json');

// Helper to clean up test newsletters
function cleanTestNewsletters(ids: string[]) {
  for (const id of ids) {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

describe('API Integration Tests', () => {
  const testIds: string[] = [];

  afterAll(() => {
    cleanTestNewsletters(testIds);
  });

  // ─── Newsletter CRUD ───────────────────────────────
  describe('Newsletters CRUD', () => {
    const testId = 'integration-test-nl-1';

    beforeAll(() => {
      testIds.push(testId);
    });

    it('POST /api/newsletters — create new newsletter', async () => {
      const res = await request(app)
        .post('/api/newsletters')
        .send({
          id: testId,
          title: 'Integration Test Newsletter',
          blocks: [{ id: 'b1', type: 'text', content: '<p>Hello</p>' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBe(testId);
      expect(res.body.newsletter.title).toBe('Integration Test Newsletter');
    });

    it('GET /api/newsletters — list includes created newsletter', async () => {
      const res = await request(app).get('/api/newsletters');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((n: { id: string }) => n.id === testId);
      expect(found).toBeDefined();
      expect(found.title).toBe('Integration Test Newsletter');
    });

    it('GET /api/newsletters/:id — get specific newsletter', async () => {
      const res = await request(app).get(`/api/newsletters/${testId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testId);
      expect(res.body.blocks).toHaveLength(1);
      expect(res.body.blocks[0].content).toBe('<p>Hello</p>');
    });

    it('POST /api/newsletters — update existing preserves createdAt', async () => {
      const before = await request(app).get(`/api/newsletters/${testId}`);
      const originalCreatedAt = before.body.createdAt;

      const res = await request(app)
        .post('/api/newsletters')
        .send({
          id: testId,
          title: 'Updated Title',
          blocks: [{ id: 'b1', type: 'text', content: '<p>Updated</p>' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.newsletter.createdAt).toBe(originalCreatedAt);
      expect(res.body.newsletter.title).toBe('Updated Title');
    });

    it('DELETE /api/newsletters/:id — delete newsletter', async () => {
      const res = await request(app).delete(`/api/newsletters/${testId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/newsletters/:id — 404 after delete', async () => {
      const res = await request(app).get(`/api/newsletters/${testId}`);
      expect(res.status).toBe(404);
    });

    it('DELETE /api/newsletters/:id — 404 for non-existent', async () => {
      const res = await request(app).delete(`/api/newsletters/${testId}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── Input Validation ───────────────────────────────
  describe('Input Validation', () => {
    it('POST /api/newsletters — 400 without blocks', async () => {
      const res = await request(app)
        .post('/api/newsletters')
        .send({ title: 'No blocks' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing blocks');
    });

    it('GET /api/newsletters/:id — 400 for invalid ID format', async () => {
      const res = await request(app).get('/api/newsletters/bad%20id%21');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid ID');
    });

    it('DELETE /api/newsletters/:id — 400 for invalid ID format', async () => {
      const res = await request(app).delete('/api/newsletters/bad%20id%21');
      expect(res.status).toBe(400);
    });

    it('POST /api/newsletters — auto-generates ID and title if missing', async () => {
      const res = await request(app)
        .post('/api/newsletters')
        .send({ blocks: [{ id: 'b1', type: 'text', content: 'test' }] });

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.newsletter.title).toBe('Untitled Newsletter');

      // Clean up
      testIds.push(res.body.id);
    });
  });

  // ─── Settings ───────────────────────────────────────
  describe('Settings API', () => {
    const originalSettings = fs.existsSync(SETTINGS_FILE)
      ? fs.readFileSync(SETTINGS_FILE, 'utf-8')
      : null;

    afterAll(() => {
      // Restore original settings
      if (originalSettings) {
        fs.writeFileSync(SETTINGS_FILE, originalSettings);
      }
    });

    it('GET /api/settings — returns current settings', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('exportPath');
    });

    it('POST /api/settings — saves export path', async () => {
      const testPath = path.join(process.cwd(), 'test-export');
      const res = await request(app)
        .post('/api/settings')
        .send({ exportPath: testPath });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/settings — returns saved settings', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.exportPath).toContain('test-export');
    });

    it('POST /api/settings — 400 for path traversal', async () => {
      const res = await request(app)
        .post('/api/settings')
        .send({ exportPath: '../../etc' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid export path');
    });
  });

  // ─── Export API ─────────────────────────────────────
  describe('Export API', () => {
    const exportDir = path.join(process.cwd(), 'test-export-integration');

    afterAll(() => {
      // Cleanup export test dir
      if (fs.existsSync(exportDir)) {
        fs.rmSync(exportDir, { recursive: true, force: true });
      }
    });

    it('POST /api/export — exports HTML file', async () => {
      const res = await request(app)
        .post('/api/export')
        .send({
          html: '<html><body>Test</body></html>',
          path: exportDir,
          filename: 'test-export.html',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(fs.existsSync(path.join(exportDir, 'test-export.html'))).toBe(true);
    });

    it('POST /api/export — 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/export')
        .send({ html: '<html></html>' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
    });

    it('POST /api/export — 400 for invalid filename', async () => {
      const res = await request(app)
        .post('/api/export')
        .send({ html: '<html></html>', path: exportDir, filename: '../bad.html' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid filename');
    });

    it('POST /api/export — 400 for invalid path', async () => {
      const res = await request(app)
        .post('/api/export')
        .send({ html: '<html></html>', path: '../../etc', filename: 'ok.html' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid export path');
    });
  });

  // ─── Image Base64 API ───────────────────────────────
  describe('Image Base64 API', () => {
    const testImageDir = path.join(process.cwd(), 'public', 'uploads');
    const testImagePath = path.join(testImageDir, 'integration-test.png');

    beforeAll(async () => {
      if (!fs.existsSync(testImageDir)) {
        await fs.promises.mkdir(testImageDir, { recursive: true });
      }
      // Create a minimal 1x1 PNG
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(testImagePath, pngBuffer);
    });

    afterAll(() => {
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });

    it('GET /api/image-base64 — returns base64 for valid image', async () => {
      const res = await request(app)
        .get('/api/image-base64')
        .query({ path: '/uploads/integration-test.png' });

      expect(res.status).toBe(200);
      expect(res.body.dataUri).toContain('data:image/png;base64,');
    });

    it('GET /api/image-base64 — 400 when path missing', async () => {
      const res = await request(app).get('/api/image-base64');
      expect(res.status).toBe(400);
    });

    it('GET /api/image-base64 — 404 for missing image', async () => {
      const res = await request(app)
        .get('/api/image-base64')
        .query({ path: '/uploads/nonexistent.png' });

      expect(res.status).toBe(404);
    });

    it('GET /api/image-base64 — 403 for path traversal', async () => {
      const res = await request(app)
        .get('/api/image-base64')
        .query({ path: '../../etc/passwd' });

      expect(res.status).toBe(403);
    });
  });

  // ─── Upload API ─────────────────────────────────────
  describe('Upload API', () => {
    it('POST /api/upload — 400 when no file provided', async () => {
      const res = await request(app).post('/api/upload');
      expect(res.status).toBe(400);
    });

    it('POST /api/upload — processes image file', async () => {
      // Create a small test PNG via sharp
      const sharp = (await import('sharp')).default;
      const testImagePath = path.join(process.cwd(), 'uploads', 'integration-test-upload.png');
      await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: 0, g: 128, b: 255, alpha: 1 },
        },
      })
        .png()
        .toFile(testImagePath);

      const res = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath);

      expect(res.status).toBe(200);
      expect(res.body.blocks).toBeDefined();
      expect(Array.isArray(res.body.blocks)).toBe(true);
      expect(res.body.blocks.length).toBeGreaterThan(0);

      // Cleanup
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });
  });
});
