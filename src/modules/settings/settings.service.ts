import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProjectSettingsDocument,
  ProjectSettingsDocumentModel,
} from './project-settings.schema';

export type ProjectSettingsVm = {
  projectName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  defaultPageSize: number;
};

type UpdateSettingsInput = {
  projectName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  defaultPageSize: number;
};

const SETTINGS_SINGLETON_KEY = 'singleton';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(ProjectSettingsDocumentModel.name)
    private readonly settingsModel: Model<ProjectSettingsDocumentModel>,
  ) {}

  async getSettings(): Promise<ProjectSettingsVm> {
    const settings = await this.ensureSettings();
    return {
      projectName: settings.projectName ?? 'NestJS Admin',
      supportEmail: settings.supportEmail ?? 'support@example.com',
      maintenanceMode: Boolean(settings.maintenanceMode),
      defaultPageSize: Number(settings.defaultPageSize) || 10,
    };
  }

  async updateSettings(input: UpdateSettingsInput): Promise<void> {
    const settings = await this.ensureSettings();
    settings.projectName = input.projectName;
    settings.supportEmail = input.supportEmail;
    settings.maintenanceMode = input.maintenanceMode;
    settings.defaultPageSize = input.defaultPageSize;
    await settings.save();
  }

  private async ensureSettings(): Promise<ProjectSettingsDocument> {
    const existing = await this.settingsModel
      .findOne({ key: SETTINGS_SINGLETON_KEY })
      .exec();
    if (existing) {
      return existing;
    }
    return this.settingsModel.create({
      key: SETTINGS_SINGLETON_KEY,
      projectName: 'NestJS Admin',
      supportEmail: 'support@example.com',
      maintenanceMode: false,
      defaultPageSize: 10,
    });
  }
}
