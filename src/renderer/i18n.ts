export type Language = "zh" | "en";

export type UiStrings = {
  appTagline: string;
  ipcReady: string;
  connecting: string;
  vaultLabel: string;
  vaultTitle: string;
  chooseVault: string;
  rescanVault: string;
  fileCount: string;
  pdfCount: string;
  mdCount: string;
  chooseVaultHintTitle: string;
  chooseVaultHintBody: string;
  pdfTab: string;
  markdownTab: string;
  graphTab: string;
  pdfReaderLabel: string;
  pdfReaderTitle: string;
  pdfReaderChooseTitle: string;
  pdfReaderChooseBody: string;
  pdfReaderMissingTitle: string;
  pdfReaderMissingBody: string;
  markdownLabel: string;
  markdownTitle: string;
  saveFailed: string;
  saving: string;
  pendingSave: string;
  saved: string;
  noMarkdownTitle: string;
  noMarkdownBody: string;
  wikiLinksTitle: string;
  wikiLinksSummary: (total: number, matched: number) => string;
  wikiLinkMatched: string;
  wikiLinkUnmatched: string;
  cycleTitle: string;
  cycleMessage: string;
  noLinksText: string;
  graphLabel: string;
  graphTitle: string;
  exitTrace: string;
  graphNodeCount: (count: number) => string;
  graphEmptyTitle: string;
  graphEmptyBody: string;
  loadingVaultError: string;
  selectingVaultError: string;
  rescanningVaultError: string;
  openingDocumentError: string;
  loadingGraphError: string;
  linkParseError: string;
  saveMarkdownError: string;
  currentDocumentRemoved: string;
  vaultMissingTitle: string;
  vaultMissingBody: string;
  noVaultFiles: string;
  noMatchedFile: string;
  languageLabel: string;
  chinese: string;
  english: string;
};

const messages: Record<Language, UiStrings> = {
  zh: {
    appTagline: "本地化学术文献管理与水系拓扑图谱工具",
    ipcReady: "IPC 就绪",
    connecting: "连接中...",
    vaultLabel: "Vault",
    vaultTitle: "本地文件树",
    chooseVault: "选择 Vault",
    rescanVault: "重新扫描",
    fileCount: "个文件",
    pdfCount: "PDF",
    mdCount: "MD",
    chooseVaultHintTitle: "选择一个文献库文件夹",
    chooseVaultHintBody: "Watercourse 会扫描这个文件夹中的 PDF 和 Markdown，并记住这个位置。",
    pdfTab: "PDF",
    markdownTab: "Markdown",
    graphTab: "图谱",
    pdfReaderLabel: "阅读器",
    pdfReaderTitle: "PDF 阅读器",
    pdfReaderChooseTitle: "选择一篇文献",
    pdfReaderChooseBody: "点击左侧文件树中的文献后，这里会显示对应 PDF。",
    pdfReaderMissingTitle: "没有对应 PDF",
    pdfReaderMissingBody: "当前文献暂未匹配到同名 PDF。",
    markdownLabel: "笔记",
    markdownTitle: "Markdown 笔记",
    saveFailed: "保存失败",
    saving: "保存中",
    pendingSave: "待保存",
    saved: "已保存",
    noMarkdownTitle: "还没有打开笔记",
    noMarkdownBody: "点击左侧文件树中的文献后，这里会打开或创建对应 Markdown。",
    wikiLinksTitle: "双链解析",
    wikiLinksSummary: (total, matched) => `${total} 个目标，${matched} 个已匹配`,
    wikiLinkMatched: "已匹配",
    wikiLinkUnmatched: "未匹配",
    cycleTitle: "循环引用警告",
    cycleMessage: "检测到循环引用，无法建立历史逆流关系。",
    noLinksText: "当前笔记还没有形如 [[文献A]] 的双链。",
    graphLabel: "图谱",
    graphTitle: "水系拓扑图谱",
    exitTrace: "退出溯源",
    graphNodeCount: (count) => `${count} 个节点`,
    graphEmptyTitle: "还没有可视化节点",
    graphEmptyBody: "先在 Markdown 中写入并保存双链，图谱会按从左到右的层级显示。",
    loadingVaultError: "Vault 加载失败。",
    selectingVaultError: "Vault 选择失败。",
    rescanningVaultError: "Vault 扫描失败。",
    openingDocumentError: "文献打开失败。",
    loadingGraphError: "图谱加载失败。",
    linkParseError: "双链解析失败。",
    saveMarkdownError: "保存失败。",
    currentDocumentRemoved: "当前打开的文献已在 Vault 中删除或移动。",
    vaultMissingTitle: "Vault 不可用",
    vaultMissingBody: "请重新选择一个本地文献库文件夹。",
    noVaultFiles: "当前 Vault 中还没有 PDF 或 Markdown 文件。",
    noMatchedFile: "Vault 中暂无同名文献",
    languageLabel: "语言",
    chinese: "中文",
    english: "English"
  },
  en: {
    appTagline: "Local-first academic literature manager with a waterway DAG",
    ipcReady: "IPC ready",
    connecting: "Connecting...",
    vaultLabel: "Vault",
    vaultTitle: "Local file tree",
    chooseVault: "Choose Vault",
    rescanVault: "Rescan",
    fileCount: "files",
    pdfCount: "PDF",
    mdCount: "MD",
    chooseVaultHintTitle: "Choose a literature folder",
    chooseVaultHintBody: "Watercourse scans PDFs and Markdown files inside that folder and remembers the location.",
    pdfTab: "PDF",
    markdownTab: "Markdown",
    graphTab: "Graph",
    pdfReaderLabel: "Reader",
    pdfReaderTitle: "PDF Reader",
    pdfReaderChooseTitle: "Select a document",
    pdfReaderChooseBody: "Pick a document from the file tree on the left to view its PDF here.",
    pdfReaderMissingTitle: "No matching PDF",
    pdfReaderMissingBody: "This document does not currently have a matching PDF file.",
    markdownLabel: "Notes",
    markdownTitle: "Markdown Notes",
    saveFailed: "Save failed",
    saving: "Saving",
    pendingSave: "Pending save",
    saved: "Saved",
    noMarkdownTitle: "No note open",
    noMarkdownBody: "Click a document in the file tree to open or create its Markdown note here.",
    wikiLinksTitle: "Wiki links",
    wikiLinksSummary: (total, matched) => `${total} targets, ${matched} matched`,
    wikiLinkMatched: "Matched",
    wikiLinkUnmatched: "Unmatched",
    cycleTitle: "Cycle warning",
    cycleMessage: "A cycle was detected, so this historical relationship cannot be created.",
    noLinksText: "This note has no wiki links like [[Paper A]].",
    graphLabel: "Graph",
    graphTitle: "Waterway topology graph",
    exitTrace: "Exit trace",
    graphNodeCount: (count) => `${count} nodes`,
    graphEmptyTitle: "No visible nodes yet",
    graphEmptyBody: "Add and save wiki links in Markdown, and the graph will lay them out left to right.",
    loadingVaultError: "Vault load failed.",
    selectingVaultError: "Vault selection failed.",
    rescanningVaultError: "Vault rescan failed.",
    openingDocumentError: "Document open failed.",
    loadingGraphError: "Graph load failed.",
    linkParseError: "Wiki link parsing failed.",
    saveMarkdownError: "Save failed.",
    currentDocumentRemoved: "The current document was removed or moved from the Vault.",
    vaultMissingTitle: "Vault unavailable",
    vaultMissingBody: "Please choose a local literature folder again.",
    noVaultFiles: "No PDF or Markdown files in the current Vault.",
    noMatchedFile: "No matching document in Vault",
    languageLabel: "Language",
    chinese: "中文",
    english: "English"
  }
};

export function getUiStrings(language: Language): UiStrings {
  return messages[language];
}

export function resolveInitialLanguage(): Language {
  const saved = window.localStorage.getItem("watercourse-language");

  if (saved === "zh" || saved === "en") {
    return saved;
  }

  return window.navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function saveLanguage(language: Language): void {
  window.localStorage.setItem("watercourse-language", language);
}
