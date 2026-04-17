import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import { TrimBodyPipe } from '../../common/pipes/trim-body.pipe';
import type { JwtPayload } from '../auth/auth.service';
import { SettingsService } from '../settings/settings.service';
import {
  FaqService,
  type FaqSortDirection,
  type FaqSortField,
} from './faq.service';
import { mapFaqsToListRows } from './faq.view-model';

@Controller('faqs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(BACKEND_ACCESS_POLICY)
export class FaqController {
  constructor(
    private readonly faqService: FaqService,
    private readonly settingsService: SettingsService,
  ) { }

  @Get()
  @Render('faq/list')
  async list(
    @CurrentUser() user: JwtPayload | null,
    @Query('page') pageQuery?: string,
    @Query('search') searchQuery?: string,
    @Query('sortBy') sortByQuery?: string,
    @Query('sortDir') sortDirQuery?: string,
  ) {

    const settings = await this.settingsService.getSettings();

    const parsedPage = Number(pageQuery);
    const page = Number.isFinite(parsedPage) ? parsedPage : 1;
    const search = searchQuery?.trim() ?? '';
    const sortBy = this.parseSortField(sortByQuery);
    const sortDir = this.parseSortDirection(sortDirQuery);

    const faqPage = await this.faqService.findPage(
      page,
      settings.defaultPageSize,
      search,
      sortBy,
      sortDir,
    );
   
    const showRolesMenu = isSuperAdminUser(user);

    const prevPage = faqPage.page > 1 ? faqPage.page - 1 : null;
    const nextPage = faqPage.page < faqPage.totalPages ? faqPage.page + 1 : null;

    return {
      ...buildAdminPageLocals({
        user,
        showRolesMenu,
        active: 'faq',
        title: 'FAQ',
        pageTitle: 'FAQ',
      }),
      faqRows: mapFaqsToListRows(
        faqPage.items,
        (faqPage.page - 1) * faqPage.pageSize + 1,
      ),
      currentPage: faqPage.page,
      totalPages: faqPage.totalPages,
      totalItems: faqPage.totalItems,
      searchValue: search,
      currentSortBy: sortBy,
      currentSortDir: sortDir,
      prevPageUrl: prevPage
        ? this.buildFaqListUrl(prevPage, search, sortBy, sortDir)
        : null,
      nextPageUrl: nextPage
        ? this.buildFaqListUrl(nextPage, search, sortBy, sortDir)
        : null,
      exportCsvUrl: this.buildFaqExportUrl(search, sortBy, sortDir),
      questionSortUrl: this.buildSortUrl('question', search, sortBy, sortDir),
      updatedAtSortUrl: this.buildSortUrl('updatedAt', search, sortBy, sortDir),
      questionSortIndicator: this.buildSortIndicator('question', sortBy, sortDir),
      updatedAtSortIndicator: this.buildSortIndicator(
        'updatedAt',
        sortBy,
        sortDir,
      ),
      errorMessage: '',
    };
  }

  @Get('export/csv')
  async exportCsv(
    @Query('search') searchQuery: string | undefined,
    @Query('sortBy') sortByQuery: string | undefined,
    @Query('sortDir') sortDirQuery: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const search = searchQuery?.trim() ?? '';
    const sortBy = this.parseSortField(sortByQuery);
    const sortDir = this.parseSortDirection(sortDirQuery);
    const faqs = await this.faqService.findAllForExport(search, sortBy, sortDir);
    const header = ['SR', 'Question', 'Answer', 'Created At', 'Updated At'];
    const rows = faqs.map((faq, index) => [
      String(index + 1),
      faq.question ?? '',
      faq.answer ?? '',
      new Date(faq.createdAt).toISOString(),
      new Date(faq.updatedAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => this.escapeCsvValue(value)).join(','))
      .join('\r\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="faqs-${timestamp}.csv"`,
    );
    res.status(200).send(csv);
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
    @Body(TrimBodyPipe) body: { question?: string; answer?: string },
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
    if (question.length > 255) {
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
        errorMessage: 'Question must be 255 characters or fewer.',
      });
      return;
    }

    await this.faqService.create(question, answer);
    res.redirect(303, '/faqs');
  }

  @Get(':id/edit')
  async editForm(
    @CurrentUser() user: JwtPayload | null,
    @Param('id') id: string,
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
    @Param('id') id: string,
    @Body(TrimBodyPipe) body: { question?: string; answer?: string },
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
    if (question.length > 255) {
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
        errorMessage: 'Question must be 255 characters or fewer.',
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
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const deleted = await this.faqService.delete(id);
    if (!deleted) {
      res.status(404).send('FAQ not found');
      return;
    }
    res.redirect(303, '/faqs');
  }

  private escapeCsvValue(value: string): string {
    const normalized = String(value ?? '');
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private buildFaqListUrl(
    page: number,
    search: string,
    sortBy: FaqSortField,
    sortDir: FaqSortDirection,
  ): string {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (search) {
      params.set('search', search);
    }
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);
    return `/faqs?${params.toString()}`;
  }

  private buildFaqExportUrl(
    search: string,
    sortBy: FaqSortField,
    sortDir: FaqSortDirection,
  ): string {
    const params = new URLSearchParams();
    if (search) {
      params.set('search', search);
    }
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);
    const serialized = params.toString();
    return serialized ? `/faqs/export/csv?${serialized}` : '/faqs/export/csv';
  }

  private buildSortUrl(
    targetField: FaqSortField,
    search: string,
    currentSortBy: FaqSortField,
    currentSortDir: FaqSortDirection,
  ): string {
    const nextDir =
      currentSortBy === targetField && currentSortDir === 'asc' ? 'desc' : 'asc';
    return this.buildFaqListUrl(1, search, targetField, nextDir);
  }

  private buildSortIndicator(
    targetField: FaqSortField,
    currentSortBy: FaqSortField,
    currentSortDir: FaqSortDirection,
  ): string {
    if (targetField !== currentSortBy) {
      return '';
    }
    return currentSortDir === 'asc' ? ' (A-Z)' : ' (Z-A)';
  }

  private parseSortField(value: string | undefined): FaqSortField {
    if (value === 'question' || value === 'updatedAt' || value === 'createdAt') {
      return value;
    }
    return 'createdAt';
  }

  private parseSortDirection(value: string | undefined): FaqSortDirection {
    return value === 'asc' ? 'asc' : 'desc';
  }
}
