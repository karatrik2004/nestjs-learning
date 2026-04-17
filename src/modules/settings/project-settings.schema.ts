import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'project_settings',
  timestamps: true,
})
export class ProjectSettingsDocumentModel {
  @Prop({ type: String, required: true, unique: true })
  key: string;

  @Prop({ type: String, default: 'NestJS Admin' })
  projectName: string;

  @Prop({ type: String, default: 'support@example.com' })
  supportEmail: string;

  @Prop({ type: Boolean, default: false })
  maintenanceMode: boolean;

  @Prop({ type: Number, default: 10, min: 1, max: 200 })
  defaultPageSize: number;

  createdAt: Date;
  updatedAt: Date;
}

export type ProjectSettingsDocument =
  HydratedDocument<ProjectSettingsDocumentModel>;
export const ProjectSettingsSchema = SchemaFactory.createForClass(
  ProjectSettingsDocumentModel,
);
