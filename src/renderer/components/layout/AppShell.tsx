import type { AppPingResponse } from "@shared/types/ipc";
import type { GraphData } from "@shared/types/graph";
import type { OpenDocumentResult } from "@shared/types/workspace";
import type { VaultFile, VaultState } from "@shared/types/vault";
import type { Language, UiStrings } from "../../i18n";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { WatercourseGraph } from "../graph/WatercourseGraph";
import { PdfReader } from "../reader/PdfReader";
import { VaultPanel } from "../vault/VaultPanel";

export type WorkspaceView = "pdf" | "markdown" | "graph";

type AppShellProps = {
  ping: AppPingResponse | null;
  vault: VaultState | null;
  loadingVault: boolean;
  vaultError: string | null;
  activeDocument: OpenDocumentResult | null;
  documentError: string | null;
  graph: GraphData | null;
  activeView: WorkspaceView;
  language: Language;
  strings: UiStrings;
  onChooseVault: () => void;
  onRescanVault: () => void;
  onSelectFile: (file: VaultFile) => void;
  onSelectRelativePath: (relativePath: string) => void;
  onChangeView: (view: WorkspaceView) => void;
  onChangeLanguage: (language: Language) => void;
  onSaveMarkdown: (relativePath: string, content: string) => Promise<void>;
  onLinksSynced: () => void;
};

export function AppShell({
  ping,
  vault,
  loadingVault,
  vaultError,
  activeDocument,
  documentError,
  graph,
  activeView,
  language,
  strings,
  onChooseVault,
  onRescanVault,
  onSelectFile,
  onSelectRelativePath,
  onChangeView,
  onChangeLanguage,
  onSaveMarkdown,
  onLinksSynced
}: AppShellProps) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Watercourse</h1>
          <p>{strings.appTagline}</p>
        </div>
        <div className="topbar-actions">
          <div className="language-switch" aria-label={strings.languageLabel}>
            <button
              type="button"
              className={language === "zh" ? "language-button language-button-active" : "language-button"}
              onClick={() => onChangeLanguage("zh")}
            >
              {strings.chinese}
            </button>
            <button
              type="button"
              className={language === "en" ? "language-button language-button-active" : "language-button"}
              onClick={() => onChangeLanguage("en")}
            >
              {strings.english}
            </button>
          </div>
          <div className="status" title="Preload IPC health check">
          <span className={ping?.status === "ok" ? "dot dot-ok" : "dot"} />
          {ping ? `${ping.appName} ${strings.ipcReady}` : strings.connecting}
        </div>
        </div>
      </header>

      <section className="workspace-grid" aria-label="Watercourse workspace">
        <VaultPanel
          vault={vault}
          loading={loadingVault}
          error={vaultError}
          strings={strings}
          onChooseVault={onChooseVault}
          onRescanVault={onRescanVault}
          selectedPath={activeDocument?.selectedFile.relativePath ?? null}
          onSelectFile={onSelectFile}
        />
        <section className="workbench" aria-label="Document workspace">
          <div className="workbench-tabs" role="tablist" aria-label="Workspace views">
            <WorkspaceTab
              view="pdf"
              activeView={activeView}
              label={strings.pdfTab}
              disabled={!activeDocument}
              onChangeView={onChangeView}
            />
            <WorkspaceTab
              view="markdown"
              activeView={activeView}
              label={strings.markdownTab}
              disabled={!activeDocument}
              onChangeView={onChangeView}
            />
            <WorkspaceTab
              view="graph"
              activeView={activeView}
              label={strings.graphTab}
              disabled={!graph}
              onChangeView={onChangeView}
            />
          </div>

          <div className="workbench-content">
            {activeView === "pdf" ? <PdfReader document={activeDocument} strings={strings} /> : null}
            {activeView === "markdown" ? (
              <MarkdownEditor
                document={activeDocument}
                strings={strings}
                onSave={onSaveMarkdown}
                onLinksSynced={onLinksSynced}
              />
            ) : null}
            {activeView === "graph" ? (
              <WatercourseGraph graph={graph} strings={strings} onSelectNode={onSelectRelativePath} />
            ) : null}
          </div>
        </section>
      </section>
      {documentError ? <div className="toast-error">{documentError}</div> : null}
    </main>
  );
}

function WorkspaceTab({
  view,
  activeView,
  label,
  disabled,
  onChangeView
}: {
  view: WorkspaceView;
  activeView: WorkspaceView;
  label: string;
  disabled: boolean;
  onChangeView: (view: WorkspaceView) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activeView === view}
      className={`workspace-tab ${activeView === view ? "workspace-tab-active" : ""}`}
      disabled={disabled}
      onClick={() => onChangeView(view)}
    >
      {label}
    </button>
  );
}
