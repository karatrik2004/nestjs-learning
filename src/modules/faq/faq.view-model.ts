import type { FaqRecord } from './faq.types';

const ANSWER_LIST_PREVIEW_CHARS = 140;

export type FaqListRowVm = {
  id: string;
  sr: number;
  question: string;
  answerPreview: string;
  answerTitleAttr: string | null;
  updatedAtLabel: string;
};

export function mapFaqsToListRows(faqs: FaqRecord[]): FaqListRowVm[] {
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
