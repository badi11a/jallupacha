import { PRIMARY_OUTLET, Router } from '@angular/router';

/** Local navigation only. Product adapters additionally restrict their own destinations. */
export function internalUrl(router: Router, value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)
    || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value.split(/[?#]/)[0])) return null;
  try {
    const tree = router.parseUrl(value);
    const primaryOnly = (group: typeof tree.root): boolean => Object.entries(group.children)
      .every(([name, child]) => name === PRIMARY_OUTLET && primaryOnly(child));
    if (!primaryOnly(tree.root)) return null;
    return router.serializeUrl(tree);
  } catch { return null; }
}

/** Only root-relative, same-origin API paths are supported by this cookie/XSRF base. */
export function isApiUrl(value: string, apiPath: string, origin: string): boolean {
  if (!/^\/[a-z0-9/_-]+$/i.test(apiPath) || apiPath.endsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return false;
  try {
    const url = new URL(value, origin);
    if (/%(?:2f|5c|2e|0[0-9a-f]|1[0-9a-f]|7f)/i.test(url.pathname)) return false;
    return url.origin === new URL(origin).origin && !url.username && !url.password
      && (url.pathname === apiPath || url.pathname.startsWith(apiPath + '/'));
  } catch { return false; }
}
