import type Database from "better-sqlite3";
import type { GraphData, GraphEdge, GraphNode } from "@shared/types/graph";
import type { DocumentRecord } from "../db/repositories/documentsRepo";
import { DocumentsRepo } from "../db/repositories/documentsRepo";
import { LinksRepo } from "../db/repositories/linksRepo";

type CanonicalDocument = DocumentRecord & {
  canonicalKey: string;
};

type CachedGraph = {
  signature: string;
  graph: GraphData;
};

const nodeWidth = 132;
const nodeHeight = 34;
const layerGap = 220;
const rowGap = 72;
const padding = 54;
const graphCache = new Map<string, CachedGraph>();

export function getGraphForVault(db: Database.Database, vaultId: string): GraphData {
  const documents = new DocumentsRepo(db).listByVault(vaultId);
  const links = new LinksRepo(db).list();
  const signature = createGraphSignature(documents, links);
  const cached = graphCache.get(vaultId);

  if (cached?.signature === signature) {
    return cloneGraph(cached.graph);
  }

  const canonicalDocuments = getCanonicalDocuments(documents);
  const documentToNodeId = createDocumentToNodeMap(documents, canonicalDocuments);
  const nodesById = new Map(canonicalDocuments.map((document) => [document.documentId, document]));
  const edges = createGraphEdges(links, documentToNodeId, nodesById);
  const layers = computeLayers(canonicalDocuments, edges);
  const nodes = layoutNodes(canonicalDocuments, layers);
  const maxX = nodes.reduce((max, node) => Math.max(max, node.x), padding);
  const maxY = nodes.reduce((max, node) => Math.max(max, node.y), padding);

  const graph = {
    nodes,
    edges,
    width: maxX + nodeWidth + padding,
    height: maxY + nodeHeight + padding,
    generatedAt: Date.now()
  };

  graphCache.set(vaultId, {
    signature,
    graph
  });

  return cloneGraph(graph);
}

export function clearGraphCache(vaultId?: string): void {
  if (vaultId) {
    graphCache.delete(vaultId);
    return;
  }

  graphCache.clear();
}

function getCanonicalDocuments(documents: DocumentRecord[]): CanonicalDocument[] {
  const byTitle = new Map<string, CanonicalDocument>();

  for (const document of documents) {
    const canonicalKey = normalizeTitle(document.title);
    const existing = byTitle.get(canonicalKey);
    const candidate = { ...document, canonicalKey };

    if (!existing || (existing.kind !== "markdown" && candidate.kind === "markdown")) {
      byTitle.set(canonicalKey, candidate);
    }
  }

  return [...byTitle.values()].sort((first, second) => first.title.localeCompare(second.title));
}

function createDocumentToNodeMap(
  documents: DocumentRecord[],
  canonicalDocuments: CanonicalDocument[]
): Map<string, string> {
  const canonicalByTitle = new Map(
    canonicalDocuments.map((document) => [document.canonicalKey, document.documentId])
  );
  const map = new Map<string, string>();

  for (const document of documents) {
    map.set(document.documentId, canonicalByTitle.get(normalizeTitle(document.title)) ?? document.documentId);
  }

  return map;
}

function createGraphEdges(
  links: ReturnType<LinksRepo["list"]>,
  documentToNodeId: Map<string, string>,
  nodesById: Map<string, CanonicalDocument>
): GraphEdge[] {
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const link of links) {
    const sourceId = documentToNodeId.get(link.sourceId);
    const targetId = documentToNodeId.get(link.targetId);

    if (!sourceId || !targetId || sourceId === targetId) {
      continue;
    }

    if (!nodesById.has(sourceId) || !nodesById.has(targetId)) {
      continue;
    }

    const edgeId = `${sourceId}->${targetId}`;

    if (seen.has(edgeId)) {
      continue;
    }

    seen.add(edgeId);
    edges.push({
      id: edgeId,
      sourceId,
      targetId
    });
  }

  return edges;
}

function computeLayers(documents: CanonicalDocument[], edges: GraphEdge[]): Map<string, number> {
  const incomingCount = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const layers = new Map<string, number>();

  for (const document of documents) {
    incomingCount.set(document.documentId, 0);
    outgoing.set(document.documentId, []);
    layers.set(document.documentId, 0);
  }

  for (const edge of edges) {
    incomingCount.set(edge.targetId, (incomingCount.get(edge.targetId) ?? 0) + 1);
    outgoing.set(edge.sourceId, [...(outgoing.get(edge.sourceId) ?? []), edge.targetId]);
  }

  const queue = documents
    .filter((document) => (incomingCount.get(document.documentId) ?? 0) === 0)
    .map((document) => document.documentId);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    visited.add(current);

    for (const target of outgoing.get(current) ?? []) {
      layers.set(target, Math.max(layers.get(target) ?? 0, (layers.get(current) ?? 0) + 1));
      incomingCount.set(target, (incomingCount.get(target) ?? 1) - 1);

      if ((incomingCount.get(target) ?? 0) === 0) {
        queue.push(target);
      }
    }
  }

  for (const document of documents) {
    if (!visited.has(document.documentId)) {
      layers.set(document.documentId, layers.get(document.documentId) ?? 0);
    }
  }

  return layers;
}

function layoutNodes(
  documents: CanonicalDocument[],
  layers: Map<string, number>
): GraphNode[] {
  const grouped = new Map<number, CanonicalDocument[]>();

  for (const document of documents) {
    const layer = layers.get(document.documentId) ?? 0;
    grouped.set(layer, [...(grouped.get(layer) ?? []), document]);
  }

  return [...grouped.entries()]
    .sort(([firstLayer], [secondLayer]) => firstLayer - secondLayer)
    .flatMap(([layer, layerDocuments]) =>
      layerDocuments
        .sort((first, second) => first.title.localeCompare(second.title))
        .map((document, index) => ({
          id: document.documentId,
          title: document.title,
          relativePath: document.relativePath,
          kind: document.kind,
          x: padding + layer * layerGap,
          y: padding + index * rowGap,
          layer
        }))
    );
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function createGraphSignature(
  documents: DocumentRecord[],
  links: ReturnType<LinksRepo["list"]>
): string {
  const documentSignature = documents
    .map(
      (document) =>
        `${document.documentId}:${document.kind}:${document.relativePath}:${document.updatedAt}:${document.fileUpdatedAt}`
    )
    .join("|");
  const linkSignature = links
    .map((link) => `${link.sourceId}->${link.targetId}:${link.createdAt}`)
    .join("|");

  return `${documentSignature}#${linkSignature}`;
}

function cloneGraph(graph: GraphData): GraphData {
  return {
    nodes: graph.nodes.map((node) => ({ ...node })),
    edges: graph.edges.map((edge) => ({ ...edge })),
    width: graph.width,
    height: graph.height,
    generatedAt: graph.generatedAt
  };
}
