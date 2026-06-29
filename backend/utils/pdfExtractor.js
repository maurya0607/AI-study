import pdfParse from 'pdf-parse';

export async function extractTextFromPdf(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('Empty PDF buffer provided');
  }
  
  try {
    const options = {

    };
    const data = await pdfParse(pdfBuffer, options);
    return data.text || '';
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw new Error('Failed to parse PDF document text: ' + error.message);
  }
}
