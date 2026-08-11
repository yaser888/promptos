export function sanitizeHtml(input: string): string {
  let html = input;

  html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<iframe[\s\S]*?(?:<\/iframe>|\/?>)/gi, "");
  html = html.replace(/<object[\s\S]*?(?:<\/object>|\/?>)/gi, "");
  html = html.replace(/<embed[\s\S]*?\/?>/gi, "");
  html = html.replace(/<link[\s\S]*?\/?>/gi, "");
  html = html.replace(/<meta[\s\S]*?\/?>/gi, "");
  html = html.replace(/<form[\s\S]*?(?:<\/form>|\/?>)/gi, "");
  html = html.replace(/<input[\s\S]*?\/?>/gi, "");

  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/\s(srcdoc|srcset|formaction)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  html = html.replace(/\s(href|src)\s*=\s*(["'])javascript:[^"']*\1/gi, "");
  html = html.replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, "");
  html = html.replace(/(["'])data:text\/html[^"']*\1/gi, "");

  return html;
}