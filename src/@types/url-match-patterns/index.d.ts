declare module 'url-match-patterns' {
  export default function match(pattern: string, url: string): boolean;
  export default function match(pattern: string): Function;
}