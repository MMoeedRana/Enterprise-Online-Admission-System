import ExcelJS from 'exceljs';
import { Types } from 'mongoose';
import { ApiError } from '../../lib/http';
import { detectMime } from '../../lib/storage';
import { AgentAttachmentModel, type AgentScope } from './agent.models';

export const ATTACHMENT_KINDS = ['pdf', 'docx', 'xlsx', 'csv', 'txt', 'paste'] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const MAX_FILE_MB = 10;
export const MAX_TEXT_CHARS = 60_000;
export const MAX_PER_MESSAGE = 5;
export const PASTE_WORDS = 500;

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export function nameFromText(text: string) {
  const words = text
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return name || 'Pasted text';
}

function looksLikeText(buffer: Buffer) {
  const sample = buffer.subarray(0, 4096);
  let bad = 0;
  for (const b of sample) if (b === 0 || (b < 32 && b !== 9 && b !== 10 && b !== 13)) bad++;
  return bad === 0;
}

async function pdfText(buffer: Buffer) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join('\n\n') : text;
}

async function docxText(buffer: Buffer) {
  const mammoth = await import('mammoth');
  const r = await (mammoth.default ?? mammoth).extractRawText({ buffer });
  return r.value;
}

async function xlsxText(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);
  const parts: string[] = [];
  wb.eachSheet((ws) => {
    parts.push(`Sheet: ${ws.name}`);
    let n = 0;
    ws.eachRow({ includeEmpty: false }, (row) => {
      if (n++ >= 2000) return;
      const values = (row.values as unknown[]).slice(1).map((v) => {
        if (v === null || v === undefined) return '';
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (typeof v === 'object') {
          const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
          if (o.richText) return o.richText.map((r) => r.text).join('');
          return String(o.text ?? o.result ?? '');
        }
        return String(v);
      });
      parts.push(values.join('\t'));
    });
  });
  return parts.join('\n');
}

export async function extractFile(file: Express.Multer.File | undefined) {
  if (!file) throw ApiError.validation('Choose a file to attach.', { fields: { file: 'Choose a file.' } });
  if (file.size > MAX_FILE_MB * 1024 * 1024)
    throw ApiError.validation(`The file is larger than ${MAX_FILE_MB} MB.`, {
      fields: { file: 'File too large.' },
    });
  const ext = file.originalname.toLowerCase().split('.').pop() ?? '';
  const mime = await detectMime(file.buffer);
  let kind: AttachmentKind;
  let text: string;
  try {
    if (mime === 'application/pdf') {
      kind = 'pdf';
      text = await pdfText(file.buffer);
    } else if (mime === DOCX || (mime === 'application/zip' && ext === 'docx')) {
      kind = 'docx';
      text = await docxText(file.buffer);
    } else if (mime === XLSX || (mime === 'application/zip' && ext === 'xlsx')) {
      kind = 'xlsx';
      text = await xlsxText(file.buffer);
    } else if (!mime && (ext === 'csv' || ext === 'txt' || ext === 'md') && looksLikeText(file.buffer)) {
      kind = ext === 'csv' ? 'csv' : 'txt';
      text = file.buffer.toString('utf8');
    } else
      throw ApiError.validation('Attach a PDF, Word (.docx), Excel (.xlsx), CSV or text file.', {
        fields: { file: 'File type not allowed.' },
      });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.validation('The file could not be read. It may be damaged or protected with a password.', {
      fields: { file: 'Unreadable file.' },
    });
  }
  return { kind, text, name: file.originalname.slice(0, 120), size: file.size };
}

export async function saveAttachment(
  owner: { userId: string; scope: AgentScope; institutionId: Types.ObjectId | null },
  a: { kind: AttachmentKind; text: string; name: string; size: number },
) {
  const clean = a.text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!clean)
    throw ApiError.validation('No text was found in this file. Scanned images without text cannot be read.', {
      fields: { file: 'No text found.' },
    });
  const truncated = clean.length > MAX_TEXT_CHARS;
  const doc = await AgentAttachmentModel.create({
    ...owner,
    name: a.name,
    kind: a.kind,
    size: a.size,
    words: countWords(clean),
    truncated,
    text: truncated ? clean.slice(0, MAX_TEXT_CHARS) : clean,
  });
  return publicAttachment(doc);
}

export function publicAttachment(a: {
  _id: unknown;
  name: string;
  kind: string;
  words: number;
  truncated?: boolean;
}) {
  return { _id: String(a._id), name: a.name, kind: a.kind, words: a.words, truncated: Boolean(a.truncated) };
}

export async function loadAttachments(
  owner: { userId: string; scope: AgentScope; institutionId: Types.ObjectId | null },
  ids: string[],
) {
  if (!ids.length) return [];
  const valid = ids.filter((id) => Types.ObjectId.isValid(id)).slice(0, MAX_PER_MESSAGE);
  const found = await AgentAttachmentModel.find({ _id: { $in: valid }, ...owner }).lean();
  if (found.length !== new Set(valid).size || valid.length !== ids.length)
    throw ApiError.validation('An attached file was not found. Please attach it again.');
  return valid.map((id) => found.find((f) => String(f._id) === id)!);
}

export function attachmentContext(
  message: string,
  files: { name: string; kind: string; words: number; truncated?: boolean; text: string }[],
) {
  if (!files.length) return message;
  const blocks = files.map(
    (f) =>
      `[Attached ${f.kind === 'paste' ? 'pasted text' : `${f.kind.toUpperCase()} file`}: "${f.name}", ${f.words} words${f.truncated ? ', shortened to its first part' : ''}]\n<<<\n${f.text}\n>>>`,
  );
  return `${message || 'Please read the attached content.'}\n\n${blocks.join('\n\n')}`;
}
