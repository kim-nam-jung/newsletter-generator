import { createCanvas, CanvasRenderingContext2D, Image } from 'canvas';

console.log('CanvasRenderingContext2D type:', typeof CanvasRenderingContext2D);
console.log('CanvasRenderingContext2D.prototype.drawImage type:', typeof CanvasRenderingContext2D.prototype.drawImage);

const canvas = createCanvas(100, 100);
const ctx = canvas.getContext('2d');

console.log('ctx.constructor.name:', ctx.constructor.name);
console.log('ctx instanceof CanvasRenderingContext2D:', ctx instanceof CanvasRenderingContext2D);
console.log('ctx.drawImage type:', typeof ctx.drawImage);
console.log('ctx.drawImage === CanvasRenderingContext2D.prototype.drawImage:', ctx.drawImage === CanvasRenderingContext2D.prototype.drawImage);

// Try to patch it
const original = CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage = function(img, ...args) {
    console.log('[DEBUG-SCRIPT] Patch hit!');
    return original.call(this, img, ...args);
}

const img = new Image();
img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

console.log('Calling ctx.drawImage with Image...');
ctx.drawImage(img, 0, 0);

console.log('Done.');
