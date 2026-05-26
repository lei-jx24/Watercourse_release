import type { VaultFile, VaultTreeNode } from "@shared/types/vault";

type FileTreeProps = {
  nodes: VaultTreeNode[];
  selectedPath: string | null;
  emptyText: string;
  onSelectFile: (file: VaultFile) => void;
};

export function FileTree({ nodes, selectedPath, emptyText, onSelectFile }: FileTreeProps) {
  if (nodes.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <ul className="file-tree">
      {nodes.map((node) => (
        <FileTreeItem
          key={node.id}
          node={node}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </ul>
  );
}

function FileTreeItem({
  node,
  selectedPath,
  onSelectFile
}: {
  node: VaultTreeNode;
  selectedPath: string | null;
  onSelectFile: (file: VaultFile) => void;
}) {
  const isDirectory = node.kind === "directory";
  const isSelected = node.file?.relativePath === selectedPath;

  return (
    <li>
      <button
        type="button"
        className={`file-tree-row file-tree-row-${node.kind} ${isSelected ? "file-tree-row-selected" : ""}`}
        disabled={isDirectory || !node.file}
        onClick={() => {
          if (node.file) {
            onSelectFile(node.file);
          }
        }}
      >
        <span className="file-tree-icon" aria-hidden="true">
          {isDirectory ? "▸" : node.kind === "pdf" ? "PDF" : "MD"}
        </span>
        <span className="file-tree-name" title={node.relativePath}>
          {node.name}
        </span>
      </button>

      {isDirectory && node.children ? (
        <ul className="file-tree file-tree-nested">
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
