// [routerLink] bound directly to a single string containing "path?query=params" does NOT
// parse the query string — Router.createUrlTree() treats the whole string as one literal
// path segment, so the "?..." ends up percent-encoded into the path itself. The resulting
// URL matches no route, so it falls through to the app's wildcard route and redirects to
// the dashboard. Every "route" string in this app's nav/breadcrumb config embeds query
// params this way (e.g. "/sales?module=purchases&tab=main"), so split it before binding:
// [routerLink]="routePath(route)" [queryParams]="routeQueryParams(route)".
export function splitRouteQuery(route: string): { path: string; queryParams: Record<string, string> } {
  const [path, query] = route.split('?');
  const queryParams: Record<string, string> = {};
  if (query) {
    for (const pair of query.split('&')) {
      const [key, value] = pair.split('=');
      if (key) queryParams[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
    }
  }
  return { path, queryParams };
}
