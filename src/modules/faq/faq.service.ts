import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Faq } from './faq.schema';
import type { FaqRecord } from './faq.types';

@Injectable()
export class FaqService {
  constructor(
    @InjectModel(Faq.name)
    private readonly faqModel: Model<Faq>,
  ) { }

  async findAll(): Promise<FaqRecord[]> {
    const rows = await this.faqModel
      .find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return rows.map((row) => ({
      id: String(row._id),
      question: row.question,
      answer: row.answer,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
    }));
  }

  async findById(id: string): Promise<FaqRecord | null> {
    if (!isValidObjectId(id)) {
      return null;
    }
    const row = await this.faqModel
      .findOne({ _id: id, deletedAt: null })
      .lean()
      .exec();

    if (!row) {
      return null;
    }
    return {
      id: String(row._id),
      question: row.question,
      answer: row.answer,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
    };
  }

  async create(question: string, answer: string): Promise<FaqRecord> {
    const faq = await this.faqModel.create({
      question: question.trim(),
      answer: answer.trim(),
      deletedAt: null,
    });
    return {
      id: String(faq._id),
      question: faq.question,
      answer: faq.answer,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
      deletedAt: faq.deletedAt ?? null,
    };
  }

  async update(id: string, question: string, answer: string): Promise<boolean> {
    if (!isValidObjectId(id)) {
      return false;
    }
    const result = await this.faqModel
      .updateOne(
        { _id: id, deletedAt: null },
        {
          $set: {
            question: question.trim(),
            answer: answer.trim(),
          },
        },
      )
      .exec();
    return result.matchedCount > 0;
  }

  async delete(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) {
      return false;
    }
    const result = await this.faqModel
      .updateOne(
        { _id: id, deletedAt: null },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
    return result.matchedCount > 0;
  }
}

