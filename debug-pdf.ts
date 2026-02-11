import { processFile } from './server/lib/processor';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function test() {
    console.log('Starting Full Processor Test with Real PDF...');
    const testPdfPath = path.resolve('test_output.pdf');
    
    try {
        // Create a dummy PDF
        console.log('Creating dummy PDF...');
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        page.drawText('Hello World!');
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(testPdfPath, pdfBytes);
        console.log(`Dummy PDF created at ${testPdfPath}`);

        console.log('Calling processFile (sliceHeight: 0)...');
        const result = await processFile(testPdfPath, 'application/pdf', 0);
        
        console.log(`SUCCESS: Processed ${result.images.length} images.`);
        
    } catch (error: any) {
        console.log('FAILURE: caught error during processing');
        console.log('Message:', error.message);
        console.log('Stack:', error.stack);
    } finally {
        // Cleanup
        if (fs.existsSync(testPdfPath)) {
            // fs.unlinkSync(testPdfPath);
            console.log('Kept PDF for inspection.');
        }
    }
}

test();
