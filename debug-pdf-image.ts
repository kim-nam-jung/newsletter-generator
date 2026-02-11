import { processFile } from './server/lib/processor';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function test() {
    console.log('Starting Image PDF Processor Test...');
    const testPdfPath = path.resolve('test_image_output.pdf');
    
    try {
        // Create a PDF with an image
        console.log('Creating PDF with embedded image...');
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        
        // 1x1 Red Pixel
        const pngImageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
        const pngImage = await pdfDoc.embedPng(pngImageBytes);
        
        page.drawImage(pngImage, {
            x: 50,
            y: 350,
            width: 100,
            height: 100,
        });

        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(testPdfPath, pdfBytes);
        console.log(`Image PDF created at ${testPdfPath}`);

        console.log('Calling processFile (sliceHeight: 0)...');
        // This is expected to fail with "TypeError: Image or Canvas expected"
        const result = await processFile(testPdfPath, 'application/pdf', 0);
        
        console.log(`SUCCESS: Processed ${result.images.length} images.`);
        
    } catch (error: any) {
        console.log('FAILURE: caught error during processing (EXPECTED)');
        console.log('Message:', error.message);
        // console.log('Stack:', error.stack);
    } finally {
        // Cleanup
        if (fs.existsSync(testPdfPath)) {
            // fs.unlinkSync(testPdfPath);
            console.log('Kept PDF for inspection.');
        }
    }
}

test();
