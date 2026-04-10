import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './faq.entity';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private readonly faqRepository: Repository<Faq>,
  ) {}

  async findAll(): Promise<Faq[]> {
    return this.faqRepository.find({ order: { id: 'DESC' } });
  }

  async findById(id: number): Promise<Faq | null> {
    return this.faqRepository.findOne({ where: { id } });
  }

  async create(question: string, answer: string): Promise<Faq> {
    const faq = this.faqRepository.create({
      question: question.trim(),
      answer: answer.trim(),
    });
    return this.faqRepository.save(faq);
  }

  async update(id: number, question: string, answer: string): Promise<boolean> {
    const result = await this.faqRepository.update(id, {
      question: question.trim(),
      answer: answer.trim(),
    });
    return (result.affected ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.faqRepository.softDelete(id);
    return (result.affected ?? 0) > 0;
  }
}

