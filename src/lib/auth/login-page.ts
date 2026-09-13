// Standalone HTML intentionally has no client bundle: every /_next asset can
// remain behind the authentication gate, including code for the private app.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function loginPage(next: string, error: string, available: boolean): string {
  const message = !available ? "ورود هنوز روی سرور تنظیم نشده است. با مدیر سامانه تماس بگیرید." :
    error === "limited" ? "تعداد تلاش‌های ورود زیاد است. ۱۵ دقیقه دیگر دوباره تلاش کنید." :
    error === "invalid" ? "نام کاربری یا رمز عبور درست نیست." : "";
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>ورود | سامانه صدور گواهی</title><style>
*{box-sizing:border-box}body{margin:0;background:#f0eeea;color:#1b1d24;font-family:Tahoma,Arial,sans-serif;min-height:100dvh;display:grid;place-items:center;padding:24px}
main{background:#fff;border:1px solid #d9d5cc;border-radius:20px;padding:40px;width:100%;max-width:420px;box-shadow:0 16px 48px #1b1d240a}
.mark{background:#1f3fc3;color:white;width:48px;height:48px;display:grid;place-items:center;border-radius:14px;margin-bottom:28px;font-size:26px}
h1{font-size:24px;margin:0 0 12px;line-height:1.6}p{font-size:13px;color:#6b6a65;line-height:2;margin:0 0 24px}
label{display:block;font-size:13px;margin:20px 0 8px}input{display:block;width:100%;border:1px solid #cfcabf;border-radius:8px;padding:13px;font-size:16px;background:#fff;color:#1b1d24;outline:none}input:focus{border-color:#1f3fc3;box-shadow:0 0 0 3px #1f3fc322}
button{width:100%;margin-top:28px;background:#1f3fc3;border:0;color:#fff;border-radius:8px;padding:14px;font:inherit;cursor:pointer}button:hover{background:#182f96}button:focus-visible{outline:3px solid #8a855e;outline-offset:3px}button:disabled{opacity:.5;cursor:not-allowed}
.error{color:#9d211a;background:#fff2f0;padding:12px;border-radius:8px;font-size:13px;line-height:1.9;margin-bottom:16px}.foot{margin:22px 0 0;text-align:center;font-size:11px}
@media(max-width:450px){main{padding:28px}body{padding:16px}}
</style></head><body><main><div class="mark" aria-hidden="true">س</div>
<h1>ورود به سامانه</h1><p>برای دسترسی به صدور گواهی، وارد حساب خود شوید.</p>
${message ? `<div class="error" role="alert">${escapeHtml(message)}</div>` : ""}
<form action="/api/auth/login" method="post">
<input type="hidden" name="next" value="${escapeHtml(next)}">
<label for="username">نام کاربری</label><input id="username" name="username" dir="ltr" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="128" required>
<label for="password">رمز عبور</label><input id="password" name="password" type="password" dir="ltr" autocomplete="current-password" maxlength="256" required>
<button type="submit"${available ? "" : " disabled"}>ورود</button></form>
<p class="foot">تا ۱۰ روز پس از آخرین استفاده، نیاز به ورود دوباره ندارید.<br>در دستگاه مشترک، پس از پایان کار از حساب خارج شوید.</p></main></body></html>`;
}
