import mammoth from 'mammoth';
import { extractText } from 'unpdf';

export interface ExtractionResult {
  text: string;
  fileType: 'PDF' | 'DOCX';
  pageCount?: number;
}

export async function extractDocumentText(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<ExtractionResult> {
  const lower = filename.toLowerCase();
  const isPdf = lower.endsWith('.pdf') || mimetype === 'application/pdf';
  const isDocx =
    lower.endsWith('.docx') ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (!isPdf && !isDocx) {
    throw new Error(
      'Unsupported file format. Please upload a valid .pdf or .docx academic document.'
    );
  }

  if (buffer.length === 0) {
    throw new Error('The uploaded file is empty (0 bytes).');
  }

  if (isPdf) {
    try {
      const result = await extractText(new Uint8Array(buffer), { mergePages: true });
      const rawText = Array.isArray(result.text) ? result.text.join('\n') : String(result.text || '');
      const cleaned = rawText.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

      if (cleaned.length < 40) {
        throw new Error(
          'Could not extract readable text from this PDF. It may be a scanned image-only PDF, encrypted, or corrupted.'
        );
      }

      return {
        text: cleaned,
        fileType: 'PDF',
        pageCount: result.totalPages,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown PDF error';
      if (msg.includes('Could not extract readable text')) {
        throw err;
      }
      throw new Error(`Failed to parse PDF document (${msg}). The file may be corrupted or password-protected.`);
    }
  }

  // DOCX extraction via mammoth
  try {
    const result = await mammoth.extractRawText({ buffer });
    const cleaned = (result.value || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

    if (cleaned.length < 40) {
      throw new Error(
        'Could not extract readable text from this DOCX file. The document appears empty or contains only embedded images.'
      );
    }

    return {
      text: cleaned,
      fileType: 'DOCX',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown DOCX error';
    if (msg.includes('Could not extract readable text')) {
      throw err;
    }
    throw new Error(`Failed to parse DOCX document (${msg}). Please ensure the file is a valid .docx archive.`);
  }
}
