import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'faqs',
  timestamps: true,
})
export class Faq {
  @Prop({ type: String, required: true, trim: true, maxlength: 255 })
  question: string;

  @Prop({ type: String, required: true, trim: true })
  answer: string;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type FaqDocument = HydratedDocument<Faq>;
export const FaqSchema = SchemaFactory.createForClass(Faq);
