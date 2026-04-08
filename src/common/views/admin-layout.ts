type NavItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

type AdminLayoutOptions = {
  title: string;
  pageTitle: string;
  userLabel?: string;
  navItems: NavItem[];
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
      <html>
        <head>
          <title>${this.escapeHtml(options.title)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              font-family: Inter, Arial, sans-serif;
              background: #0b1220;
              color: #e2e8f0;
            }
            a { color: inherit; }
            .app {
              min-height: 100vh;
              display: grid;
              grid-template-columns: 260px 1fr;
              grid-template-rows: 64px 1fr 44px;
              grid-template-areas:
                "sidebar header"
                "sidebar main"
                "sidebar footer";
              background:
                radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.16), transparent 35%),
                radial-gradient(circle at 85% 15%, rgba(96, 165, 250, 0.12), transparent 30%),
                linear-gradient(135deg, #0b1220, #0b1220);
            }
            header {
              grid-area: header;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 18px;
              border-bottom: 1px solid rgba(148, 163, 184, 0.18);
              background: rgba(15, 23, 42, 0.55);
              backdrop-filter: blur(10px);
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
              min-width: 0;
            }
            .brand {
              font-weight: 800;
              letter-spacing: 0.2px;
              color: #f8fafc;
              white-space: nowrap;
            }
            .user-pill {
              display: inline-flex;
              align-items: center;
              gap: 10px;
              padding: 8px 10px;
              border-radius: 999px;
              border: 1px solid rgba(148, 163, 184, 0.22);
              background: rgba(30, 41, 59, 0.55);
              color: #cbd5e1;
              font-size: 13px;
              max-width: 520px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .avatar {
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: linear-gradient(90deg, #38bdf8, #22d3ee);
              box-shadow: 0 6px 18px rgba(34, 211, 238, 0.24);
              flex: 0 0 auto;
            }
            .header-actions {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .btn {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              height: 36px;
              padding: 0 12px;
              border-radius: 10px;
              font-size: 13px;
              font-weight: 700;
              text-decoration: none;
              border: 1px solid rgba(148, 163, 184, 0.22);
              background: rgba(148, 163, 184, 0.12);
              color: #e2e8f0;
            }
            .btn:hover { background: rgba(148, 163, 184, 0.20); }
            .btn-primary {
              border: none;
              background: linear-gradient(90deg, #38bdf8, #22d3ee);
              color: #0b1220;
            }
            .btn-primary:hover { filter: brightness(1.05); }
            aside {
              grid-area: sidebar;
              padding: 18px 14px;
              border-right: 1px solid rgba(148, 163, 184, 0.18);
              background: rgba(2, 6, 23, 0.55);
              backdrop-filter: blur(10px);
            }
            .nav-title {
              font-size: 12px;
              color: #94a3b8;
              margin: 14px 10px 8px;
              text-transform: uppercase;
              letter-spacing: 0.9px;
            }
            .nav a {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 12px;
              border-radius: 12px;
              text-decoration: none;
              color: #e2e8f0;
              border: 1px solid transparent;
            }
            .nav a:hover {
              background: rgba(148, 163, 184, 0.10);
              border-color: rgba(148, 163, 184, 0.16);
            }
            .nav .active {
              background: rgba(56, 189, 248, 0.14);
              border-color: rgba(56, 189, 248, 0.20);
              color: #e0f2fe;
            }
            .dot {
              width: 8px;
              height: 8px;
              border-radius: 999px;
              background: #38bdf8;
              box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.14);
              flex: 0 0 auto;
            }
            main {
              grid-area: main;
              padding: 18px;
            }
            .content {
              max-width: 1040px;
              margin: 0 auto;
              border: 1px solid rgba(148, 163, 184, 0.18);
              background: rgba(15, 23, 42, 0.55);
              backdrop-filter: blur(10px);
              border-radius: 18px;
              padding: 18px;
              box-shadow: 0 25px 50px rgba(2, 6, 23, 0.45);
            }
            footer {
              grid-area: footer;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 18px;
              border-top: 1px solid rgba(148, 163, 184, 0.18);
              color: #94a3b8;
              font-size: 12px;
              background: rgba(2, 6, 23, 0.45);
              backdrop-filter: blur(10px);
            }
            @media (max-width: 860px) {
              .app {
                grid-template-columns: 1fr;
                grid-template-rows: 64px auto 1fr 44px;
                grid-template-areas:
                  "header"
                  "sidebar"
                  "main"
                  "footer";
              }
              aside { border-right: none; border-bottom: 1px solid rgba(148, 163, 184, 0.18); }
            }
          </style>
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
