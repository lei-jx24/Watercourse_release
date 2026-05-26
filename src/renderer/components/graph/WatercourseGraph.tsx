import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphData, GraphEdge, GraphNode } from "@shared/types/graph";
import type { UiStrings } from "../../i18n";

const nodeRadius = 6;

type WatercourseGraphProps = {
  graph: GraphData | null;
  strings: UiStrings;
  onSelectNode: (relativePath: string) => void;
};

export function WatercourseGraph({ graph, strings, onSelectNode }: WatercourseGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, number>>({});
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [interaction, setInteraction] = useState<GraphInteraction | null>(null);

  useEffect(() => {
    setFocusedNodeId(null);
    setNodeOffsets({});
    setViewport({ x: 0, y: 0, scale: 1 });
  }, [graph?.generatedAt]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        window.clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const displayNodes = useMemo(() => {
    return (graph?.nodes ?? []).map((node) => ({
      ...node,
      y: node.y + (nodeOffsets[node.id] ?? 0)
    }));
  }, [graph?.nodes, nodeOffsets]);

  const focus = useMemo(() => {
    if (!graph || !focusedNodeId) {
      return null;
    }

    return getGraphFocus(focusedNodeId, graph.edges);
  }, [graph, focusedNodeId]);

  function getSvgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current;

    if (!svg) {
      return { x: clientX, y: clientY };
    }

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(svg.getScreenCTM()?.inverse());
  }

  function getWorldPoint(clientX: number, clientY: number): { x: number; y: number } {
    const svgPoint = getSvgPoint(clientX, clientY);

    return {
      x: (svgPoint.x - viewport.x) / viewport.scale,
      y: (svgPoint.y - viewport.y) / viewport.scale
    };
  }

  function startNodePointer(nodeId: string, clientX: number, clientY: number) {
    const worldPoint = getWorldPoint(clientX, clientY);

    setInteraction({
      kind: "node",
      nodeId,
      startWorldY: worldPoint.y,
      startClientX: clientX,
      startClientY: clientY,
      startOffsetY: nodeOffsets[nodeId] ?? 0,
      moved: false
    });
  }

  function startCanvasPointer(clientX: number, clientY: number) {
    const svgPoint = getSvgPoint(clientX, clientY);

    setInteraction({
      kind: "canvas",
      startSvgX: svgPoint.x,
      startSvgY: svgPoint.y,
      startClientX: clientX,
      startClientY: clientY,
      startViewport: viewport,
      moved: false
    });
  }

  function movePointer(clientX: number, clientY: number) {
    if (!interaction) {
      return;
    }

    const moved =
      interaction.moved ||
      Math.abs(clientX - interaction.startClientX) > 3 ||
      Math.abs(clientY - interaction.startClientY) > 3;

    if (interaction.kind === "node") {
      const currentWorld = getWorldPoint(clientX, clientY);
      const deltaY = currentWorld.y - interaction.startWorldY;

      setInteraction({ ...interaction, moved });
      setNodeOffsets((current) => ({
        ...current,
        [interaction.nodeId]: interaction.startOffsetY + deltaY
      }));
      return;
    }

    const currentSvg = getSvgPoint(clientX, clientY);

    setInteraction({ ...interaction, moved });
    setViewport({
      ...interaction.startViewport,
      x: interaction.startViewport.x + currentSvg.x - interaction.startSvgX,
      y: interaction.startViewport.y + currentSvg.y - interaction.startSvgY
    });
  }

  function finishPointer() {
    setInteraction(null);
  }

  function zoomAt(clientX: number, clientY: number, deltaY: number) {
    const svgPoint = getSvgPoint(clientX, clientY);
    const nextScale = clamp(viewport.scale * (deltaY < 0 ? 1.12 : 0.88), 0.45, 2.8);
    const worldX = (svgPoint.x - viewport.x) / viewport.scale;
    const worldY = (svgPoint.y - viewport.y) / viewport.scale;

    setViewport({
      scale: nextScale,
      x: svgPoint.x - worldX * nextScale,
      y: svgPoint.y - worldY * nextScale
    });
  }

  function selectNode(relativePath: string) {
    onSelectNode(relativePath);
  }

  function focusNode(nodeId: string) {
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    setFocusedNodeId(nodeId);
  }

  function scheduleNodeSelect(relativePath: string, moved: boolean) {
    if (moved) {
      return;
    }

    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = window.setTimeout(() => {
      selectNode(relativePath);
      clickTimerRef.current = null;
    }, 180);
  }

  return (
    <section className="workspace-pane graph-pane" aria-label={strings.graphTitle}>
      <div className="pane-header-row">
        <div>
          <div className="pane-kicker">{strings.graphLabel}</div>
          <h2>{strings.graphTitle}</h2>
        </div>
        <div className="graph-actions">
          {focusedNodeId ? (
            <button type="button" onClick={() => setFocusedNodeId(null)}>
              {strings.exitTrace}
            </button>
          ) : null}
          <span className="save-status">
            {graph ? strings.graphNodeCount(graph.nodes.length) : strings.noVaultFiles}
          </span>
        </div>
      </div>

      {graph && graph.nodes.length > 0 ? (
        <svg
          ref={svgRef}
          className="graph-canvas"
          viewBox={`0 0 ${Math.max(graph.width, 960)} ${Math.max(graph.height, 520)}`}
          role="img"
          aria-label="Watercourse graph"
          onWheel={(event) => {
            event.preventDefault();
            zoomAt(event.clientX, event.clientY, event.deltaY);
          }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              event.currentTarget.setPointerCapture(event.pointerId);
              startCanvasPointer(event.clientX, event.clientY);
            }
          }}
          onPointerMove={(event) => movePointer(event.clientX, event.clientY)}
          onPointerUp={finishPointer}
          onPointerLeave={finishPointer}
        >
          <rect
            x="0"
            y="0"
            width={Math.max(graph.width, 960)}
            height={Math.max(graph.height, 520)}
            className="graph-surface"
          />

          <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.scale})`}>
            {graph.edges.map((edge) => (
              <GraphEdgePath key={edge.id} edge={edge} nodes={displayNodes} focus={focus} />
            ))}

            {displayNodes.map((node) => (
              <GraphNodeView
                key={node.id}
                node={node}
                focus={focus}
                interaction={interaction}
                onFocusNode={focusNode}
                onStartNodePointer={startNodePointer}
                onScheduleNodeSelect={scheduleNodeSelect}
              />
            ))}
          </g>
        </svg>
      ) : (
        <div className="pane-empty">
          <h3>{strings.graphEmptyTitle}</h3>
          <p>{strings.graphEmptyBody}</p>
        </div>
      )}
    </section>
  );
}

function GraphEdgePath({
  edge,
  nodes,
  focus
}: {
  edge: GraphEdge;
  nodes: GraphNode[];
  focus: GraphFocus | null;
}) {
  const source = nodes.find((node) => node.id === edge.sourceId);
  const target = nodes.find((node) => node.id === edge.targetId);

  if (!source || !target) {
    return null;
  }

  const startX = source.x;
  const startY = source.y;
  const endX = target.x;
  const endY = target.y;
  const deltaX = Math.max(80, (endX - startX) * 0.5);

  const path = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
  const focusState = getEdgeFocusState(edge, focus);

  return (
    <path
      d={path}
      className={`graph-edge graph-edge-${focusState}`}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function GraphNodeView({
  node,
  focus,
  onFocusNode,
  interaction,
  onStartNodePointer,
  onScheduleNodeSelect
}: {
  node: GraphNode;
  focus: GraphFocus | null;
  interaction: GraphInteraction | null;
  onFocusNode: (nodeId: string) => void;
  onStartNodePointer: (nodeId: string, clientX: number, clientY: number) => void;
  onScheduleNodeSelect: (relativePath: string, moved: boolean) => void;
}) {
  const focusState = getNodeFocusState(node.id, focus);
  const isDragging = interaction?.kind === "node" && interaction.nodeId === node.id;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      className={`graph-node-group graph-node-group-${focusState} ${isDragging ? "graph-node-group-dragging" : ""}`}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        onStartNodePointer(node.id, event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        onScheduleNodeSelect(node.relativePath, isDragging && interaction.moved);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onFocusNode(node.id);
      }}
    >
      <circle
        r={nodeRadius}
        className={`graph-node graph-node-${node.kind}`}
      />
      <text x={12} y={4} className="graph-node-title">
        {node.title}
      </text>
    </g>
  );
}

type GraphInteraction =
  | {
      kind: "node";
      nodeId: string;
      startWorldY: number;
      startClientX: number;
      startClientY: number;
      startOffsetY: number;
      moved: boolean;
    }
  | {
      kind: "canvas";
      startSvgX: number;
      startSvgY: number;
      startClientX: number;
      startClientY: number;
      startViewport: { x: number; y: number; scale: number };
      moved: boolean;
    };

type GraphFocus = {
  centerId: string;
  ancestorIds: Set<string>;
  descendantIds: Set<string>;
  relatedNodeIds: Set<string>;
  relatedEdgeIds: Set<string>;
};

function getGraphFocus(centerId: string, edges: GraphEdge[]): GraphFocus {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  for (const edge of edges) {
    incoming.set(edge.targetId, [...(incoming.get(edge.targetId) ?? []), edge.sourceId]);
    outgoing.set(edge.sourceId, [...(outgoing.get(edge.sourceId) ?? []), edge.targetId]);
  }

  const ancestorIds = walkGraph(centerId, incoming);
  const descendantIds = walkGraph(centerId, outgoing);
  const relatedNodeIds = new Set([centerId, ...ancestorIds, ...descendantIds]);
  const relatedEdgeIds = new Set(
    edges
      .filter((edge) => relatedNodeIds.has(edge.sourceId) && relatedNodeIds.has(edge.targetId))
      .map((edge) => edge.id)
  );

  return {
    centerId,
    ancestorIds,
    descendantIds,
    relatedNodeIds,
    relatedEdgeIds
  };
}

function walkGraph(startId: string, adjacency: Map<string, string[]>): Set<string> {
  const visited = new Set<string>();
  const stack = [...(adjacency.get(startId) ?? [])];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    stack.push(...(adjacency.get(current) ?? []));
  }

  return visited;
}

function getNodeFocusState(nodeId: string, focus: GraphFocus | null): "normal" | "center" | "related" | "dimmed" {
  if (!focus) {
    return "normal";
  }

  if (focus.centerId === nodeId) {
    return "center";
  }

  if (focus.relatedNodeIds.has(nodeId)) {
    return "related";
  }

  return "dimmed";
}

function getEdgeFocusState(edge: GraphEdge, focus: GraphFocus | null): "normal" | "related" | "dimmed" {
  if (!focus) {
    return "normal";
  }

  return focus.relatedEdgeIds.has(edge.id) ? "related" : "dimmed";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
