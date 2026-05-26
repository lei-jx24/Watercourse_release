export type GraphNode = {
  id: string;
  title: string;
  relativePath: string;
  kind: "pdf" | "markdown";
  x: number;
  y: number;
  layer: number;
};

export type GraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  generatedAt: number;
};
