import type { Faq } from './faq.entity';

const ANSWER_LIST_PREVIEW_CHARS = 140;

export type FaqListRowVm = {
  id: number;
  sr: number;
  question: string;
  answerPreview: string;
  answerTitleAttr: string | null;
  updatedAtLabel: string;
};

export function mapFaqsToListRows(faqs: Faq[]): FaqListRowVm[] {
  return faqs.map((faq, index) => {
    const rawAnswer = faq.answer ?? '';
    const normalized = rawAnswer.replace(/\s+/g, ' ').trim();
    const isTruncated = normalized.length > ANSWER_LIST_PREVIEW_CHARS;
    const previewPlain = isTruncated
      ? `${normalized.slice(0, ANSWER_LIST_PREVIEW_CHARS - 1)}…`
      : normalized;
    return {
      id: faq.id,
      sr: index + 1,
      question: faq.question,
      answerPreview: previewPlain,
      answerTitleAttr: isTruncated ? rawAnswer : null,
      updatedAtLabel: new Date(faq.updatedAt).toLocaleString(),
    };
  });
}
