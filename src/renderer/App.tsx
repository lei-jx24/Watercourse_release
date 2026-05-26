import { useEffect, useRef, useState } from "react";
import type { AppPingResponse } from "@shared/types/ipc";
import type { GraphData } from "@shared/types/graph";
import type { OpenDocumentResult } from "@shared/types/workspace";
import type { VaultFile, VaultState } from "@shared/types/vault";
import { getUiStrings, resolveInitialLanguage, saveLanguage, type Language } from "./i18n";
import { AppShell, type WorkspaceView } from "./components/layout/AppShell";

export function App() {
  const [language, setLanguage] = useState<Language>(() => resolveInitialLanguage());
  const strings = getUiStrings(language);
  const [ping, setPing] = useState<AppPingResponse | null>(null);
  const [vault, setVault] = useState<VaultState | null>(null);
  const [loadingVault, setLoadingVault] = useState(true);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<OpenDocumentResult | null>(null);
  const activeDocumentRef = useRef<OpenDocumentResult | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("pdf");

  useEffect(() => {
    activeDocumentRef.current = activeDocument;
  }, [activeDocument]);

  useEffect(() => {
    window.watercourse.ping().then(setPing).catch(console.error);
    window.watercourse.vault
      .getState()
      .then(setVault)
      .catch((error: unknown) => {
        setVaultError(error instanceof Error ? error.message : strings.loadingVaultError);
      })
        .finally(() => {
          setLoadingVault(false);
        });
    refreshGraph().catch(console.error);

    const unsubscribeVaultChanged = window.watercourse.vault.onChanged((event) => {
      setVault(event.vault);
      refreshGraph().catch(console.error);

      const currentDocument = activeDocumentRef.current;

      if (
        currentDocument &&
        event.vault.scan &&
        !event.vault.scan.files.some(
          (file) =>
            file.relativePath === currentDocument.selectedFile.relativePath ||
            file.relativePath === currentDocument.markdownFile.relativePath
        )
      ) {
        setActiveDocument(null);
        setDocumentError(strings.currentDocumentRemoved);
      }
    });

    return () => {
      unsubscribeVaultChanged();
    };
  }, []);

  async function refreshGraph() {
    try {
      setGraph(await window.watercourse.graph.get());
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : strings.loadingGraphError);
    }
  }

  async function chooseVault() {
    setLoadingVault(true);
    setVaultError(null);

    try {
      const nextVault = await window.watercourse.vault.choose();
      setVault(nextVault);
      setActiveDocument(null);
      await refreshGraph();
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : strings.selectingVaultError);
    } finally {
      setLoadingVault(false);
    }
  }

  async function rescanVault() {
    setLoadingVault(true);
    setVaultError(null);

    try {
      setVault(await window.watercourse.vault.rescan());
      await refreshGraph();
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : strings.rescanningVaultError);
    } finally {
      setLoadingVault(false);
    }
  }

  async function selectFile(file: VaultFile) {
    setDocumentError(null);

    try {
      const openedDocument = await window.watercourse.documents.open({
        relativePath: file.relativePath
      });
      setActiveDocument(openedDocument);
      setVault(openedDocument.vault);
      setActiveView(file.kind === "markdown" ? "markdown" : "pdf");
      await refreshGraph();
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : strings.openingDocumentError);
    }
  }

  async function selectRelativePath(relativePath: string) {
    setDocumentError(null);

    try {
      const openedDocument = await window.watercourse.documents.open({
        relativePath
      });
      setActiveDocument(openedDocument);
      setVault(openedDocument.vault);
      await refreshGraph();
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : strings.openingDocumentError);
    }
  }

  async function saveMarkdown(relativePath: string, content: string) {
    await window.watercourse.documents.saveMarkdown({
      relativePath,
      content
    });
  }

  return (
    <AppShell
      ping={ping}
      vault={vault}
      loadingVault={loadingVault}
      vaultError={vaultError}
      activeDocument={activeDocument}
      documentError={documentError}
      graph={graph}
      activeView={activeView}
      language={language}
      strings={strings}
      onChooseVault={chooseVault}
      onRescanVault={rescanVault}
      onSelectFile={selectFile}
      onSelectRelativePath={selectRelativePath}
      onChangeView={setActiveView}
      onChangeLanguage={(nextLanguage) => {
        setLanguage(nextLanguage);
        saveLanguage(nextLanguage);
      }}
      onSaveMarkdown={saveMarkdown}
      onLinksSynced={refreshGraph}
    />
  );
}
