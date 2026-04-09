import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  BACKEND_ACCESS_POLICY,
  Roles,
} from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtPayload } from '../auth/auth.service';
import { FaqService } from './faq.service';
import { FaqViews } from './faq.views';

@Controller('faqs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(BACKEND_ACCESS_POLICY)
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload | null,
    @Res() res: Response,
  ): Promise<void> {
    const faqs = await this.faqService.findAll();
    res
      .status(200)
      .send(FaqViews.list(faqs, { showRolesMenu: this.isSuperAdmin(user) }));
  }

  @Get('new')
  newForm(@CurrentUser() user: JwtPayload | null, @Res() res: Response): void {
    res
      .status(200)
      .send(FaqViews.form('Create FAQ', '/faqs/create', undefined, this.isSuperAdmin(user)));
  }

  @Post('create')
  async create(
    @CurrentUser() user: JwtPayload | null,
    @Body() body: { question?: string; answer?: string },
    @Res() res: Response,
  ): Promise<void> {
    const question = body.question?.trim() ?? '';
    const answer = body.answer?.trim() ?? '';
    const showRolesMenu = this.isSuperAdmin(user);

    if (!question || !answer) {
      res.status(400).send(
        FaqViews.form(
          'Create FAQ',
          '/faqs/create',
          {
            question,
            answer,
            errorMessage: 'Question and answer are required.',
          },
          showRolesMenu,
        ),
      );
      return;
    }

    await this.faqService.create(question, answer);
    res.redirect(303, '/faqs');
  }

  @Get(':id/edit')
  async editForm(
    @CurrentUser() user: JwtPayload | null,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const faq = await this.faqService.findById(id);
    if (!faq) {
      res.status(404).send('FAQ not found');
      return;
    }
    res
      .status(200)
      .send(FaqViews.form('Edit FAQ', `/faqs/${id}/update`, faq, this.isSuperAdmin(user)));
  }

  @Post(':id/update')
  async update(
    @CurrentUser() user: JwtPayload | null,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { question?: string; answer?: string },
    @Res() res: Response,
  ): Promise<void> {
    const question = body.question?.trim() ?? '';
    const answer = body.answer?.trim() ?? '';
    const showRolesMenu = this.isSuperAdmin(user);

    if (!question || !answer) {
      res.status(400).send(
        FaqViews.form(
          'Edit FAQ',
          `/faqs/${id}/update`,
          {
            question,
            answer,
            errorMessage: 'Question and answer are required.',
          },
          showRolesMenu,
        ),
      );
      return;
    }

    await this.faqService.update(id, question, answer);
    res.redirect(303, '/faqs');
  }

  @Post(':id/delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    await this.faqService.delete(id);
    res.redirect(303, '/faqs');
  }

  private isSuperAdmin(user: JwtPayload | null): boolean {
    return (user?.role ?? '').trim().toLowerCase() === 'super admin';
  }
}

