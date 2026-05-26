import type { OpenDocumentResult } from "@shared/types/workspace";
import type { UiStrings } from "../../i18n";

type PdfReaderProps = {
  document: OpenDocumentResult | null;
  strings: UiStrings;
};

export function PdfReader({ document, strings }: PdfReaderProps) {
  return (
    <section className="workspace-pane reader-pane" aria-label={strings.pdfReaderTitle}>
      <div className="pane-kicker">{strings.pdfReaderLabel}</div>
      <h2>{strings.pdfReaderTitle}</h2>

      {document?.pdfUrl ? (
        <iframe className="pdf-frame" title={`${document.title} PDF`} src={document.pdfUrl} />
      ) : (
        <div className="pane-empty">
          <h3>{document ? strings.pdfReaderMissingTitle : strings.pdfReaderChooseTitle}</h3>
          <p>{document ? strings.pdfReaderMissingBody : strings.pdfReaderChooseBody}</p>
        </div>
      )}
    </section>
  );
}
