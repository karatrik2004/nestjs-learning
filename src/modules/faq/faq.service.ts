import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, isValidObjectId } from 'mongoose';
import { Faq } from './faq.schema';
import type { FaqRecord } from './faq.types';

export type FaqPageResult = {
  items: FaqRecord[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type FaqSortField = 'createdAt' | 'updatedAt' | 'question';
export type FaqSortDirection = 'asc' | 'desc';

@Injectable()
export class FaqService {
  constructor(
    @InjectModel(Faq.name)
    private readonly faqModel: Model<Faq>,
  ) { }

  /** Returns paginated FAQ rows using search/sort options. */
  async findPage(
    page: number,
    pageSize: number,
    searchQuery?: string,
    sortField: FaqSortField = 'createdAt',
    sortDirection: FaqSortDirection = 'desc',
  ): Promise<FaqPageResult> {
    // Guard pagination inputs so callers cannot request invalid/huge pages.
    const normalizedPageSize = Math.min(Math.max(Math.trunc(pageSize), 1), 200);
    const normalizedSearch = searchQuery?.trim() ?? '';
    const hasSearch = normalizedSearch.length > 0;
    const totalItems = hasSearch
      ? await this.countWithSearchFallback(normalizedSearch)
      : await this.faqModel.countDocuments({ deletedAt: null }).exec();
    const totalPages = Math.max(Math.ceil(totalItems / normalizedPageSize), 1);
    const normalizedPage = Math.min(Math.max(Math.trunc(page), 1), totalPages);
    const skip = (normalizedPage - 1) * normalizedPageSize;

    const rows = hasSearch
      ? await this.findWithSearchFallback(
        normalizedSearch,
        skip,
        normalizedPageSize,
        sortField,
        sortDirection,
      )
      : await this.faqModel
        .find({ deletedAt: null })
        .sort(this.buildMongoSort(sortField, sortDirection))
        .skip(skip)
        .limit(normalizedPageSize)
        .lean()
        .exec();
    return {
      items: rows.map((row) => this.mapToFaqRecord(row)),
      totalItems,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalPages,
    };
  }

  /** Returns all FAQs for CSV export with optional search/sort. */
  async findAllForExport(
    searchQuery?: string,
    sortField: FaqSortField = 'createdAt',
    sortDirection: FaqSortDirection = 'desc',
  ): Promise<FaqRecord[]> {
    const normalizedSearch = searchQuery?.trim() ?? '';
    const hasSearch = normalizedSearch.length > 0;
    const rows = hasSearch
      ? await this.findWithSearchFallback(
        normalizedSearch,
        0,
        0,
        sortField,
        sortDirection,
      )
      : await this.faqModel
        .find({ deletedAt: null })
        .sort(this.buildMongoSort(sortField, sortDirection))
        .lean()
        .exec();
    return rows.map((row) => this.mapToFaqRecord(row));
  }

  /** Returns one FAQ by id, ignoring soft-deleted records. */
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

  /** Creates a new FAQ row with trimmed question/answer fields. */
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

  /** Updates a FAQ row by id; returns false when row is not found. */
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

  /** Soft deletes a FAQ by setting deletedAt timestamp. */
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

  /** Counts search matches using Atlas Search pipeline. */
  private async countByAtlasSearch(searchText: string): Promise<number> {
    const searchRegex = this.buildSearchRegex(searchText);
    const rows = await this.faqModel
      .aggregate<{ total: number }>([
        {
          $search: {
            index: 'default',
            compound: {
              should: [
                {
                  text: {
                    query: searchText,
                    path: ['question', 'answer'],
                  },
                },
              ],
              minimumShouldMatch: 1,
            },
          },
        },
        {
          $match: {
            deletedAt: null,
            $or: [{ question: searchRegex }, { answer: searchRegex }],
          },
        },
        {
          $count: 'total',
        },
      ] as PipelineStage[])
      .exec();
    return rows[0]?.total ?? 0;
  }

  /** Fetches search results using Atlas Search with paging/sorting. */
  private async findByAtlasSearch(
    searchText: string,
    skip: number,
    limit: number,
    sortField: FaqSortField,
    sortDirection: FaqSortDirection,
  ): Promise<Array<Record<string, unknown>>> {
    const searchRegex = this.buildSearchRegex(searchText);
    const pipeline: PipelineStage[] = [
      {
        $search: {
          index: 'default',
          compound: {
            should: [
              {
                text: {
                  query: searchText,
                  path: ['question', 'answer'],
                },
              },
            ],
            minimumShouldMatch: 1,
          },
        },
      },
      {
        $match: {
          deletedAt: null,
          $or: [{ question: searchRegex }, { answer: searchRegex }],
        },
      },
      {
        $sort: this.buildMongoSort(sortField, sortDirection),
      },
    ];

    if (skip > 0) {
      pipeline.push({ $skip: skip });
    }
    if (limit > 0) {
      pipeline.push({ $limit: limit });
    }
    return this.faqModel.aggregate<Record<string, unknown>>(pipeline).exec();
  }

  /** Counts search matches using regex fallback query. */
  private async countByRegex(searchText: string): Promise<number> {
    const searchRegex = this.buildSearchRegex(searchText);
    return this.faqModel
      .countDocuments({
        deletedAt: null,
        $or: [{ question: searchRegex }, { answer: searchRegex }],
      })
      .exec();
  }

  /** Fetches regex fallback search results with paging/sorting. */
  private async findByRegex(
    searchText: string,
    skip: number,
    limit: number,
    sortField: FaqSortField,
    sortDirection: FaqSortDirection,
  ): Promise<Array<Record<string, unknown>>> {
    const searchRegex = this.buildSearchRegex(searchText);
    const query = this.faqModel
      .find({
        deletedAt: null,
        $or: [{ question: searchRegex }, { answer: searchRegex }],
      })
      .sort(this.buildMongoSort(sortField, sortDirection))
      .skip(skip);
    if (limit > 0) {
      query.limit(limit);
    }
    const rows = await query.lean().exec();
    return rows as unknown as Array<Record<string, unknown>>;
  }

  /** Uses Atlas count first, then falls back to regex count. */
  private async countWithSearchFallback(searchText: string): Promise<number> {
    // Prefer Atlas Search, but fallback keeps UX working if index/query behavior
    // is stricter than expected in a given environment.
    try {
      const atlasCount = await this.countByAtlasSearch(searchText);
      if (atlasCount > 0) {
        return atlasCount;
      }
    } catch {
      // Atlas index/config may not support current query shape; fallback below.
    }
    return this.countByRegex(searchText);
  }

  /** Uses Atlas search first, then falls back to regex search. */
  private async findWithSearchFallback(
    searchText: string,
    skip: number,
    limit: number,
    sortField: FaqSortField,
    sortDirection: FaqSortDirection,
  ): Promise<Array<Record<string, unknown>>> {
    // Same strategy as count: use Atlas first, then deterministic regex fallback.
    try {
      const atlasRows = await this.findByAtlasSearch(
        searchText,
        skip,
        limit,
        sortField,
        sortDirection,
      );
      if (atlasRows.length > 0) {
        return atlasRows;
      }
    } catch {
      // Atlas index/config may not support current query shape; fallback below.
    }
    return this.findByRegex(searchText, skip, limit, sortField, sortDirection);
  }

  /** Normalizes database row shape into FaqRecord response model. */
  private mapToFaqRecord(row: Record<string, unknown>): FaqRecord {
    return {
      id: String(row._id),
      question: String(row.question ?? ''),
      answer: String(row.answer ?? ''),
      createdAt: new Date(row.createdAt as string | Date),
      updatedAt: new Date(row.updatedAt as string | Date),
      deletedAt: row.deletedAt ? new Date(row.deletedAt as string | Date) : null,
    };
  }

  /** Escapes regex special characters in user-provided search text. */
  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Builds case-insensitive regex for search matching. */
  private buildSearchRegex(searchText: string): RegExp {
    return new RegExp(this.escapeRegExp(searchText), 'i');
  }

  /** Converts sort inputs into Mongo sort object format. */
  private buildMongoSort(
    sortField: FaqSortField,
    sortDirection: FaqSortDirection,
  ): Record<string, 1 | -1> {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return { [sortField]: direction } as Record<string, 1 | -1>;
  }
}

