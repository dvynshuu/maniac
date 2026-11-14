/**
 * ─── Active Recall & Cloze / Q&A Parser ───────────────────────────
 * Extracts Anki-style cloze deletions ({{c1::answer}} or {{answer}})
 * and Q&A syntax (>> Question :: Answer) from any text, toggle, or block.
 */

export interface ExtractedCloze {
  index: number;
  answer: string;
  hint?: string;
  masked: string;
  full: string;
}

export interface ExtractedQA {
  question: string;
  answer: string;
}

export interface ParsedBlockFlashcard {
  id: string;
  pageId: string;
  blockId: string;
  type: 'cloze' | 'qa' | 'block';
  question: string;
  answer: string;
  clozeMasked?: string;
  ease: number;
  interval: number;
  nextReview: number;
  streak: number;
  lastGrade?: number | null;
  updatedAt: number;
}

/**
 * Extracts cloze deletions from plain or HTML text.
 * Matches:
 *  - {{c1::answer}}
 *  - {{c1::answer::hint}}
 *  - {{answer}}
 */
export function extractClozesFromText(rawText: string): ExtractedCloze[] {
  if (!rawText) return [];
  const text = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const clozes: ExtractedCloze[] = [];

  // Match {{c1::answer::hint}}, {{c1::answer}}, or {{answer}}
  const clozeRegex = /\{\{(?:c(\d+)::)?([^}:]+?)(?:::([^}]+?))?\}\}/g;
  let match;

  while ((match = clozeRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const index = match[1] ? parseInt(match[1], 10) : 1;
    const answer = (match[2] || '').trim();
    const hint = (match[3] || '').trim();

    if (!answer) continue;

    const maskLabel = hint ? `[ ... (${hint}) ]` : '[ ... ]';
    const maskedText = text.replace(fullMatch, maskLabel);

    clozes.push({
      index,
      answer,
      hint: hint || undefined,
      masked: maskedText,
      full: text
    });
  }

  return clozes;
}

/**
 * Extracts Q&A flashcards from text.
 * Matches:
 *  - ">> Question :: Answer"
 *  - ">> Question? Answer"
 *  - "Q: Question\nA: Answer"
 */
export function extractQAFromText(rawText: string): ExtractedQA[] {
  if (!rawText) return [];
  const text = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const qas: ExtractedQA[] = [];

  // Match >> Question :: Answer
  const arrowRegex = />>\s*(.+?)\s*::\s*(.+)/g;
  let match;
  while ((match = arrowRegex.exec(text)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    if (question && answer) {
      qas.push({ question, answer });
    }
  }

  // Match >> Question? Answer
  const questionMarkRegex = />>\s*([^?]+?\?)\s*([^\n\r]+)/g;
  while ((match = questionMarkRegex.exec(text)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    if (question && answer && !qas.some(q => q.question === question)) {
      qas.push({ question, answer });
    }
  }

  return qas;
}

/**
 * Strips HTML tags and collapses spaces.
 */
export function cleanText(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parses all flashcards out of a single block.
 */
export function extractFlashcardsFromBlock(
  block: any,
  pageId: string,
  existingFlashcards: Record<string, ParsedBlockFlashcard> = {}
): ParsedBlockFlashcard[] {
  if (!block || !block.id) return [];
  const results: ParsedBlockFlashcard[] = [];
  const plainText = cleanText(block.content || '');

  // 1. Dedicated Flashcard Block
  if (block.type === 'flashcard') {
    const props = block.properties || {};
    const cardId = `card_block_${block.id}`;
    const prev = existingFlashcards[cardId];

    const isCloze = props.cardType === 'cloze';
    const clozeText = props.clozeText || plainText || '';
    const clozes = isCloze ? extractClozesFromText(clozeText) : [];

    results.push({
      id: cardId,
      pageId,
      blockId: block.id,
      type: isCloze ? 'cloze' : 'qa',
      question: isCloze ? (clozes[0]?.masked || clozeText) : (props.question || 'Untitled Question'),
      answer: isCloze ? (clozes[0]?.answer || 'Answer') : (props.answer || 'Untitled Answer'),
      clozeMasked: isCloze ? clozes[0]?.masked : undefined,
      ease: prev?.ease || props.ease || 2.5,
      interval: prev?.interval || props.interval || 1,
      nextReview: prev?.nextReview || props.nextReview || Date.now(),
      streak: prev?.streak || props.streak || 0,
      lastGrade: prev?.lastGrade !== undefined ? prev.lastGrade : props.lastGrade,
      updatedAt: block.updatedAt || Date.now(),
    });
    return results;
  }

  // 2. Cloze Deletion in any text/toggle/callout block: {{c1::answer}}
  const clozes = extractClozesFromText(plainText);
  clozes.forEach((cloze, idx) => {
    const cardId = `cloze_${block.id}_${idx}`;
    const prev = existingFlashcards[cardId];

    results.push({
      id: cardId,
      pageId,
      blockId: block.id,
      type: 'cloze',
      question: cloze.masked,
      answer: cloze.answer,
      clozeMasked: cloze.masked,
      ease: prev?.ease || 2.5,
      interval: prev?.interval || 1,
      nextReview: prev?.nextReview || Date.now(),
      streak: prev?.streak || 0,
      lastGrade: prev?.lastGrade || null,
      updatedAt: block.updatedAt || Date.now(),
    });
  });

  // 3. >> Q&A in any text/toggle block
  const qas = extractQAFromText(plainText);
  qas.forEach((qa, idx) => {
    const cardId = `qa_${block.id}_${idx}`;
    const prev = existingFlashcards[cardId];

    results.push({
      id: cardId,
      pageId,
      blockId: block.id,
      type: 'qa',
      question: qa.question,
      answer: qa.answer,
      ease: prev?.ease || 2.5,
      interval: prev?.interval || 1,
      nextReview: prev?.nextReview || Date.now(),
      streak: prev?.streak || 0,
      lastGrade: prev?.lastGrade || null,
      updatedAt: block.updatedAt || Date.now(),
    });
  });

  // 4. Toggle block as Q&A: if toggle content has a question mark or text, and is a toggle
  if ((block.type === 'toggle' || block.type === 'toggle_heading1' || block.type === 'toggle_heading2' || block.type === 'toggle_heading3') && plainText.includes('?')) {
    const cardId = `toggle_qa_${block.id}`;
    const prev = existingFlashcards[cardId];

    // If no clozes or >> QA already captured
    if (clozes.length === 0 && qas.length === 0) {
      results.push({
        id: cardId,
        pageId,
        blockId: block.id,
        type: 'qa',
        question: plainText,
        answer: 'Expand toggle in notes to verify answer',
        ease: prev?.ease || 2.5,
        interval: prev?.interval || 1,
        nextReview: prev?.nextReview || Date.now(),
        streak: prev?.streak || 0,
        lastGrade: prev?.lastGrade || null,
        updatedAt: block.updatedAt || Date.now(),
      });
    }
  }

  return results;
}
