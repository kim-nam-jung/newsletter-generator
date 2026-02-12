import { app } from './app';

const port = parseInt(process.env.PORT || '3000', 10);

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
