import type { VaultFile, VaultState } from "@shared/types/vault";
import type { UiStrings } from "../../i18n";
import { FileTree } from "./FileTree";

type VaultPanelProps = {
  vault: VaultState | null;
  loading: boolean;
  error: string | null;
  strings: UiStrings;
  onChooseVault: () => void;
  onRescanVault: () => void;
  selectedPath: string | null;
  onSelectFile: (file: VaultFile) => void;
};

export function VaultPanel({
  vault,
  loading,
  error,
  strings,
  onChooseVault,
  onRescanVault,
  selectedPath,
  onSelectFile
}: VaultPanelProps) {
  const fileCount = vault?.scan?.files.length ?? 0;
  const pdfCount = vault?.scan?.files.filter((file) => file.kind === "pdf").length ?? 0;
  const markdownCount = vault?.scan?.files.filter((file) => file.kind === "markdown").length ?? 0;

  return (
    <section className="vault-panel" aria-label="Vault">
      <div className="pane-kicker">{strings.vaultLabel}</div>
      <h2>{strings.vaultTitle}</h2>

      <div className="vault-actions">
        <button type="button" onClick={onChooseVault} disabled={loading}>
          {strings.chooseVault}
        </button>
        <button type="button" onClick={onRescanVault} disabled={loading || !vault?.rootPath}>
          {strings.rescanVault}
        </button>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      {vault?.rootPath ? (
        <>
          <p className="vault-path" title={vault.rootPath}>
            {vault.rootPath}
          </p>
          <div className="vault-stats">
            <span>{fileCount} {strings.fileCount}</span>
            <span>{pdfCount} {strings.pdfCount}</span>
            <span>{markdownCount} {strings.mdCount}</span>
          </div>
          <FileTree
            nodes={vault.scan?.tree ?? []}
            selectedPath={selectedPath}
            emptyText={strings.noVaultFiles}
            onSelectFile={onSelectFile}
          />
        </>
      ) : (
        <div className="vault-empty">
          <h3>{strings.chooseVaultHintTitle}</h3>
          <p>{strings.chooseVaultHintBody}</p>
        </div>
      )}
    </section>
  );
}
