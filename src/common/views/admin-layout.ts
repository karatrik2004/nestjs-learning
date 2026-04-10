import type { AdminNavItem } from './admin-nav-items';

type AdminLayoutOptions = {
  title: string;
  pageTitle: string;
  userLabel?: string;
  navItems: AdminNavItem[];
  footerLeft?: string;
  footerRight?: string;
  contentHtml: string;
};

export class AdminLayout {
  static render(options: AdminLayoutOptions): string {
    const nav = options.navItems
      .map((item) => {
        const activeClass = item.isActive ? 'active' : '';
        return `<a class="${activeClass}" href="${item.href}"><span class="dot"></span>${this.escapeHtml(item.label)}</a>`;
      })
      .join('');

    const safeUserLabel = options.userLabel
      ? this.escapeHtml(options.userLabel)
      : 'Signed in';

    return `
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${this.escapeHtml(options.title)}</title>
          <link rel="stylesheet" href="/css/admin-panel.css" />
        </head>
        <body>
          <div class="app">
            <aside>
              <div class="brand" style="padding: 6px 10px;">Admin Panel</div>
              <div class="nav-title">Navigation</div>
              <nav class="nav">${nav}</nav>
              <div class="nav-title">Account</div>
              <nav class="nav">
                <a href="/logout"><span class="dot" style="background:#fca5a5; box-shadow:0 0 0 3px rgba(252,165,165,0.14);"></span>Logout</a>
              </nav>
            </aside>

            <header>
              <div class="header-left">
                <div class="brand">${this.escapeHtml(options.pageTitle)}</div>
                <div class="user-pill" title="${safeUserLabel}">
                  <span class="avatar"></span>
                  <span>${safeUserLabel}</span>
                </div>
              </div>
              <div class="header-actions">
                <a class="btn" href="/dashboard">Dashboard</a>
                <a class="btn" href="/users">Users</a>
                <a class="btn btn-primary" href="/logout">Logout</a>
              </div>
            </header>

            <main>
              <div class="content">
                ${options.contentHtml}
              </div>
            </main>

            <footer>
              <span>${this.escapeHtml(options.footerLeft ?? `© ${new Date().getFullYear()} NestJS Admin`)}</span>
              <span>${this.escapeHtml(options.footerRight ?? 'JWT + Refresh + Guards')}</span>
            </footer>
          </div>
        </body>
      </html>
    `;
  }

  private static escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
