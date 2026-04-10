import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'roles',
  timestamps: true,
})
export class RoleDocumentModel {
  @Prop({ type: String, required: true, unique: true, trim: true, maxlength: 50 })
  name: string;

  @Prop({ type: String, default: null, maxlength: 255 })
  description: string | null;

  @Prop({ type: Boolean, default: false })
  canAccessBackend: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type RoleDocument = HydratedDocument<RoleDocumentModel>;
export const RoleSchema = SchemaFactory.createForClass(RoleDocumentModel);
