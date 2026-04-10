import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'users',
  timestamps: false,
})
export class UserDocumentModel {
  @Prop({ type: String, required: true, unique: true, trim: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String, default: null, maxlength: 100 })
  name: string | null;

  @Prop({ type: String, default: null, maxlength: 20 })
  phone: string | null;

  @Prop({ type: String, default: null })
  profileImage: string | null;

  @Prop({ type: String, default: null })
  roleId: string | null;

  @Prop({ type: String, default: null })
  refreshTokenHash: string | null;
}

export type UserDocument = HydratedDocument<UserDocumentModel>;
export const UserSchema = SchemaFactory.createForClass(UserDocumentModel);
