import { useEffect, useState } from "react";
import type { ParseWikiLinksResult } from "@shared/types/link";
import type { OpenDocumentResult } from "@shared/types/workspace";
import type { UiStrings } from "../../i18n";
import { useDebouncedEffect } from "../../hooks/useDebouncedEffect";

type MarkdownEditorProps = {
  document: OpenDocumentResult | null;
  strings: UiStrings;
  onSave: (relativePath: string, content: string) => Promise<void>;
  onLinksSynced: () => void;
};

export function MarkdownEditor({ document, strings, onSave, onLinksSynced }: MarkdownEditorProps) {
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkParse, setLinkParse] = useState<ParseWikiLinksResult | null>(null);
  const [linkParseError, setLinkParseError] = useState<string | null>(null);

  useEffect(() => {
    setContent(document?.markdownContent ?? "");
    setDirty(false);
    setSaving(false);
    setError(null);
    setLinkParse(null);
    setLinkParseError(null);
  }, [document?.markdownFile.relativePath, document?.markdownContent]);

  useDebouncedEffect(
    () => {
      if (!document) {
        return;
      }

      window.watercourse.links
        .parse({
          markdownRelativePath: document.markdownFile.relativePath,
          content
        })
        .then(setLinkParse)
        .then(() => {
          onLinksSynced();
        })
        .catch((parseError: unknown) => {
          setLinkParseError(parseError instanceof Error ? parseError.message : strings.linkParseError);
        });
    },
    [content, document?.markdownFile.relativePath],
    500
  );

  useDebouncedEffect(
    () => {
      if (!document || !dirty) {
        return;
      }

      setSaving(true);
      setError(null);
        onSave(document.markdownFile.relativePath, content)
        .then(() => {
          setDirty(false);
        })
        .catch((saveError: unknown) => {
          setError(saveError instanceof Error ? saveError.message : strings.saveMarkdownError);
        })
        .finally(() => {
          setSaving(false);
        });
    },
    [content, dirty, document?.markdownFile.relativePath],
    600
  );

  return (
    <section className="workspace-pane notes-pane" aria-label={strings.markdownTitle}>
      <div className="pane-header-row">
        <div>
          <div className="pane-kicker">{strings.markdownLabel}</div>
          <h2>{strings.markdownTitle}</h2>
        </div>
        <span className="save-status">
          {error ? strings.saveFailed : saving ? strings.saving : dirty ? strings.pendingSave : document ? strings.saved : ""}
        </span>
      </div>

      {document ? (
        <>
          <p className="document-path" title={document.markdownFile.relativePath}>
            {document.markdownFile.relativePath}
          </p>
          {error ? <p className="error-message">{error}</p> : null}
          <textarea
            className="markdown-textarea"
            spellCheck={false}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setDirty(true);
            }}
          />
          <WikiLinkPanel result={linkParse} error={linkParseError} strings={strings} />
        </>
      ) : (
        <div className="pane-empty">
          <h3>{strings.noMarkdownTitle}</h3>
          <p>{strings.noMarkdownBody}</p>
        </div>
      )}
    </section>
  );
}

function WikiLinkPanel({
  result,
  error,
  strings
}: {
  result: ParseWikiLinksResult | null;
  error: string | null;
  strings: UiStrings;
}) {
  if (error) {
    return <p className="error-message">{error}</p>;
  }

  const links = result?.links ?? [];
  const matchedCount = links.filter((link) => link.status === "matched").length;
  const violations = result?.sync?.violations ?? [];

  return (
    <div className="wiki-link-panel" aria-label="Wiki link parser">
      <div className="wiki-link-summary">
        <span>{strings.wikiLinksTitle}</span>
        <span>{strings.wikiLinksSummary(links.length, matchedCount)}</span>
      </div>

      {violations.length > 0 ? (
        <div className="cycle-warning">
          <strong>{strings.cycleTitle}</strong>
          {violations.map((violation) => (
            <p key={`${violation.sourceId}-${violation.targetId}`}>
              {violation.sourceTitle}: {strings.cycleMessage}
            </p>
          ))}
        </div>
      ) : null}

      {links.length > 0 ? (
        <ul className="wiki-link-list">
          {links.map((link) => (
            <li key={`${link.startIndex}-${link.targetTitle}`}>
              <span className={`wiki-link-status wiki-link-status-${link.status}`}>
                {link.status === "matched" ? strings.wikiLinkMatched : strings.wikiLinkUnmatched}
              </span>
              <span className="wiki-link-target">{link.targetTitle}</span>
              <span className="wiki-link-path">
                {link.matchedFile?.relativePath ?? strings.noMatchedFile}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">{strings.noLinksText}</p>
      )}
    </div>
  );
}
