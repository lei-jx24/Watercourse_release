export type DocumentKind = "pdf" | "markdown";

export type LiteratureDocument = {
  id: string;
  title: string;
  kind: DocumentKind;
  path: string;
};
