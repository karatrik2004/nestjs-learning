import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Render,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { isSuperAdminUser } from '../../common/auth/role-utils';
import { buildAdminPageLocals } from '../../common/page/admin-page-locals';
import {
  BACKEND_ACCESS_POLICY,
  Roles,
} from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtPayload } from '../auth/auth.service';
import { FaqService } from './faq.service';
import { mapFaqsToListRows } from './faq.view-model';

@Controller('faqs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(BACKEND_ACCESS_POLICY)
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  @Render('faq/list')
  async list(@CurrentUser() user: JwtPayload | null) {
    const faqs = await this.faqService.findAll();
    const showRolesMenu = isSuperAdminUser(user);
    return {
      ...buildAdminPageLocals({
        user,
        showRolesMenu,
        active: 'faq',
        title: 'FAQ',
        pageTitle: 'FAQ',
      }),
      faqRows: mapFaqsToListRows(faqs),
      errorMessage: '',
    };
  }

  @Get('new')
  @Render('faq/form')
  newForm(@CurrentUser() user: JwtPayload | null) {
    const showRolesMenu = isSuperAdminUser(user);
    return {
      ...buildAdminPageLocals({
        user,
        showRolesMenu,
        active: 'faq',
        title: 'Create FAQ',
        pageTitle: 'Create FAQ',
      }),
      formTitle: 'Create FAQ',
      formDescription: 'Maintain FAQ content for frontend users.',
      formAction: '/faqs/create',
      questionValue: '',
      answerValue: '',
      errorMessage: '',
    };
  }

  @Post('create')
  async create(
    @CurrentUser() user: JwtPayload | null,
    @Body() body: { question?: string; answer?: string },
    @Res() res: Response,
  ): Promise<void> {
    const question = body.question?.trim() ?? '';
    const answer = body.answer?.trim() ?? '';
    const showRolesMenu = isSuperAdminUser(user);

    if (!question || !answer) {
      res.status(400).render('faq/form', {
        ...buildAdminPageLocals({
          user,
          showRolesMenu,
          active: 'faq',
          title: 'Create FAQ',
          pageTitle: 'Create FAQ',
        }),
        formTitle: 'Create FAQ',
        formDescription: 'Maintain FAQ content for frontend users.',
        formAction: '/faqs/create',
        questionValue: question,
        answerValue: answer,
        errorMessage: 'Question and answer are required.',
      });
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
    const showRolesMenu = isSuperAdminUser(user);
    res.render('faq/form', {
      ...buildAdminPageLocals({
        user,
        showRolesMenu,
        active: 'faq',
        title: 'Edit FAQ',
        pageTitle: 'Edit FAQ',
      }),
      formTitle: 'Edit FAQ',
      formDescription: 'Maintain FAQ content for frontend users.',
      formAction: `/faqs/${id}/update`,
      questionValue: faq.question,
      answerValue: faq.answer ?? '',
      errorMessage: '',
    });
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
    const showRolesMenu = isSuperAdminUser(user);

    if (!question || !answer) {
      res.status(400).render('faq/form', {
        ...buildAdminPageLocals({
          user,
          showRolesMenu,
          active: 'faq',
          title: 'Edit FAQ',
          pageTitle: 'Edit FAQ',
        }),
        formTitle: 'Edit FAQ',
        formDescription: 'Maintain FAQ content for frontend users.',
        formAction: `/faqs/${id}/update`,
        questionValue: question,
        answerValue: answer,
        errorMessage: 'Question and answer are required.',
      });
      return;
    }

    const updated = await this.faqService.update(id, question, answer);
    if (!updated) {
      res.status(404).send('FAQ not found');
      return;
    }
    res.redirect(303, '/faqs');
  }

  @Post(':id/delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const deleted = await this.faqService.delete(id);
    if (!deleted) {
      res.status(404).send('FAQ not found');
      return;
    }
    res.redirect(303, '/faqs');
  }
}
