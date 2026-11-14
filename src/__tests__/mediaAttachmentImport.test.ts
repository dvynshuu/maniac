import { describe, it, expect } from 'vitest';
import { parseMarkdownToBlocks } from '../features/notion-import/parser/markdownParser';
import { getMimeType } from '../features/notion-import/parser/assetParser';
import { resolveAssetReferences } from '../features/notion-import/reconstruction/assetResolver';

describe('Notion Import Media & Attachment Blocks Pipeline', () => {
  describe('MIME Type Inference', () => {
    it('infers audio, video, pdf, and archive mime types accurately', () => {
      expect(getMimeType('song.mp3')).toBe('audio/mpeg');
      expect(getMimeType('voice.wav')).toBe('audio/wav');
      expect(getMimeType('clip.mp4')).toBe('video/mp4');
      expect(getMimeType('movie.webm')).toBe('video/webm');
      expect(getMimeType('report.pdf')).toBe('application/pdf');
      expect(getMimeType('archive.zip')).toBe('application/zip');
      expect(getMimeType('doc.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });

  describe('Markdown Parser Media Block Generation', () => {
    it('parses standalone PDF attachment link as pdf block', () => {
      const md = `[Quarterly Report.pdf](attachments/Quarterly%20Report.pdf)`;
      const blocks = parseMarkdownToBlocks(md, 'page-1');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('pdf');
      expect(blocks[0].properties.name).toBe('Quarterly Report.pdf');
      expect(blocks[0]._assetSrc).toBe('attachments/Quarterly%20Report.pdf');
    });

    it('parses standalone Audio link as audio block', () => {
      const md = `[Episode 1.mp3](audio/Episode%201.mp3)`;
      const blocks = parseMarkdownToBlocks(md, 'page-1');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('audio');
      expect(blocks[0].properties.name).toBe('Episode 1.mp3');
      expect(blocks[0]._assetSrc).toBe('audio/Episode%201.mp3');
    });

    it('parses standalone Video link as video block', () => {
      const md = `[Demo Recording.mp4](videos/Demo%20Recording.mp4)`;
      const blocks = parseMarkdownToBlocks(md, 'page-1');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('video');
      expect(blocks[0]._assetSrc).toBe('videos/Demo%20Recording.mp4');
    });

    it('parses standalone generic file attachment link as file block', () => {
      const md = `[Source Code.zip](data/Source%20Code.zip)`;
      const blocks = parseMarkdownToBlocks(md, 'page-1');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('file');
      expect(blocks[0].properties.name).toBe('Source Code.zip');
    });

    it('parses image syntax pointing to a pdf/audio/video as the respective media block', () => {
      const mdAudio = `![Podcast Audio](audio/podcast.mp3)`;
      const blocksAudio = parseMarkdownToBlocks(mdAudio, 'page-1');
      expect(blocksAudio[0].type).toBe('audio');

      const mdVideo = `![Screen Capture](videos/screen.mp4)`;
      const blocksVideo = parseMarkdownToBlocks(mdVideo, 'page-1');
      expect(blocksVideo[0].type).toBe('video');

      const mdPdf = `![Spec](docs/spec.pdf)`;
      const blocksPdf = parseMarkdownToBlocks(mdPdf, 'page-1');
      expect(blocksPdf[0].type).toBe('pdf');
    });
  });

  describe('Asset Reference Resolution', () => {
    it('resolves audio, video, pdf, and file references with hash, mimeType and blob URL', () => {
      const blocks: any[] = [
        {
          id: 'b-1',
          pageId: 'p-1',
          type: 'pdf',
          properties: { name: 'Doc' },
          _assetSrc: 'attachments/spec.pdf',
        },
        {
          id: 'b-2',
          pageId: 'p-1',
          type: 'audio',
          properties: { name: 'Music' },
          _assetSrc: 'track.mp3',
        }
      ];

      const pages: any[] = [{ id: 'p-1', title: 'Page 1', sourcePath: 'Page 1.md' }];
      const assetMap = new Map<string, any>([
        ['attachments/spec.pdf', {
          id: 'asset-1',
          hash: 'hash-pdf-123',
          filename: 'spec.pdf',
          mimeType: 'application/pdf',
          zipPath: 'attachments/spec.pdf',
        }],
        ['track.mp3', {
          id: 'asset-2',
          hash: 'hash-audio-456',
          filename: 'track.mp3',
          mimeType: 'audio/mpeg',
          zipPath: 'track.mp3',
        }]
      ]);

      const diagnostics = { warn: () => {} };
      const resolved = resolveAssetReferences(blocks, pages, assetMap, diagnostics as any);

      expect(resolved).toBe(2);
      expect(blocks[0].properties.hash).toBe('hash-pdf-123');
      expect(blocks[0].properties.src).toBe('blob://hash-pdf-123');
      expect(blocks[0].properties.mimeType).toBe('application/pdf');
      expect(blocks[0]._assetSrc).toBeUndefined();

      expect(blocks[1].properties.hash).toBe('hash-audio-456');
      expect(blocks[1].properties.src).toBe('blob://hash-audio-456');
      expect(blocks[1].properties.mimeType).toBe('audio/mpeg');
      expect(blocks[1]._assetSrc).toBeUndefined();
    });
  });
});
