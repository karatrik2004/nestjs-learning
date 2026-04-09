import { AdminLayout } from '../../common/views/admin-layout';
import type { Faq } from './faq.entity';

type FaqFormData = {
  question?: string;
  answer?: string;
  errorMessage?: string;
};

export class FaqViews {
  static list(
    faqs: Faq[],
    options?: { errorMessage?: string; showRolesMenu?: boolean },
  ): string {
    const showRolesMenu = options?.showRolesMenu ?? true;
    const errorBlock = options?.errorMessage
      ? `<p style="color:#fca5a5; margin:0 0 10px;">${this.escapeHtml(options.errorMessage)}</p>`
      : '';

    const rows = faqs
      .map(
        (faq, index) => `
          <tr>
            <td style="padding:10px 12px;">${index + 1}</td>
            <td style="padding:10px 12px;">${this.escapeHtml(faq.question)}</td>
            <td style="padding:10px 12px;">${this.escapeHtml(faq.answer)}</td>
            <td style="padding:10px 12px;">${this.formatDate(faq.updatedAt)}</td>
            <td style="padding:10px 12px;">
              <div style="display:flex; gap:8px; align-items:center;">
                <a class="btn" href="/faqs/${faq.id}/edit" style="text-decoration:none;">Edit</a>
                <form method="post" action="/faqs/${faq.id}/delete" style="display:inline;" onsubmit="return confirm('Delete this FAQ?');">
                  <button class="btn" type="submit">Delete</button>
                </form>
              </div>
            </td>
          </tr>
        `,
      )
      .join('');

    const navItems: Array<{ label: string; href: string; isActive?: boolean }> = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Users', href: '/users' },
      { label: 'FAQ', href: '/faqs', isActive: true },
    ];
    if (showRolesMenu) {
      navItems.splice(2, 0, { label: 'Roles', href: '/roles' });
    }

    return AdminLayout.render({
      title: 'FAQ',
      pageTitle: 'FAQ',
      navItems,
      contentHtml: `
        <h1 style="margin:0 0 8px; font-size:26px; color:#f8fafc;">FAQ Management</h1>
        <p style="margin:0 0 14px; color:#94a3b8; font-size:13px;">Create and manage frequently asked questions.</p>
        ${errorBlock}
        <a class="btn btn-primary" href="/faqs/new" style="text-decoration:none; margin-bottom:14px;">Add FAQ</a>
        <div style="margin-top:14px; overflow:auto; border:1px solid rgba(148,163,184,0.18); border-radius:14px;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background: rgba(2,6,23,0.35); text-align:left;">
                <th style="padding:10px 12px;">SR</th>
                <th style="padding:10px 12px;">Question</th>
                <th style="padding:10px 12px;">Answer</th>
                <th style="padding:10px 12px;">Updated At</th>
                <th style="padding:10px 12px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="5" style="padding:12px; color:#94a3b8;">No FAQs found.</td></tr>`}
            </tbody>
          </table>
        </div>
      `,
    });
  }

  static form(
    title: string,
    action: string,
    data?: FaqFormData,
    showRolesMenu = true,
  ): string {
    const navItems: Array<{ label: string; href: string; isActive?: boolean }> = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Users', href: '/users' },
      { label: 'FAQ', href: '/faqs', isActive: true },
    ];
    if (showRolesMenu) {
      navItems.splice(2, 0, { label: 'Roles', href: '/roles' });
    }

    const safeQuestion = this.escapeHtml(data?.question ?? '');
    const safeAnswer = this.escapeHtml(data?.answer ?? '');
    const errorBlock = data?.errorMessage
      ? `<p style="color:#fca5a5; margin:0 0 10px;">${this.escapeHtml(data.errorMessage)}</p>`
      : '';

    return AdminLayout.render({
      title,
      pageTitle: title,
      navItems,
      contentHtml: `
        <h1 style="margin:0 0 8px; font-size:26px; color:#f8fafc;">${this.escapeHtml(title)}</h1>
        <p style="margin:0 0 14px; color:#94a3b8; font-size:13px;">Maintain FAQ content for frontend users.</p>
        ${errorBlock}
        <form method="post" action="${action}" style="display:grid; gap:12px; max-width:760px;">
          <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
            Question *
            <input name="question" required maxlength="255" value="${safeQuestion}" style="height:40px; border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:0 12px;" />
          </label>
          <label style="display:grid; gap:6px; color:#cbd5e1; font-size:13px;">
            Answer *
            <textarea name="answer" required rows="6" style="border-radius:10px; border:1px solid rgba(148,163,184,0.22); background: rgba(2,6,23,0.25); color:#e2e8f0; padding:10px 12px; resize:vertical;">${safeAnswer}</textarea>
          </label>
          <div style="display:flex; gap:10px; align-items:center;">
            <button class="btn btn-primary" type="submit">Save</button>
            <a class="btn" href="/faqs" style="text-decoration:none;">Cancel</a>
          </div>
        </form>
      `,
    });
  }

  private static escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private static formatDate(value: Date | string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return this.escapeHtml(date.toLocaleString());
  }
}

