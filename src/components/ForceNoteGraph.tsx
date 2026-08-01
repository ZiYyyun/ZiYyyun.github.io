import {
	forceCenter,
	forceCollide,
	forceLink,
	forceManyBody,
	forceSimulation,
	forceX,
	forceY,
} from 'd3-force';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { NoteGraph } from '../lib/noteGraph';

type Props = {
	graph: NoteGraph;
};

type SimNode = NoteGraph['nodes'][number] & {
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
	fx?: number | null;
	fy?: number | null;
};

type SimLink = {
	source: string | SimNode;
	target: string | SimNode;
};

const width = 340;
const height = 310;
const padding = 24;

function initialNodes(graph: NoteGraph): SimNode[] {
	return graph.nodes.map((node, index) => {
		const angle = (index / Math.max(graph.nodes.length, 1)) * Math.PI * 2;
		const radius = node.active ? 0 : 72 + (index % 3) * 16;
		return {
			...node,
			x: width / 2 + Math.cos(angle) * radius,
			y: height / 2 + Math.sin(angle) * radius,
		};
	});
}

function shortTitle(title: string) {
	return title.length > 12 ? `${title.slice(0, 11)}…` : title;
}

export default function ForceNoteGraph({ graph }: Props) {
	const [nodes, setNodes] = useState<SimNode[]>(() => initialNodes(graph));
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const simNodesRef = useRef<SimNode[]>([]);
	const simulationRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
	const dragRef = useRef<{ id: string; pointerId: number; moved: boolean } | null>(null);
	const suppressClickRef = useRef(false);

	const graphKey = useMemo(
		() => `${graph.nodes.map((node) => node.id).join('|')}::${graph.edges.map((edge) => `${edge.from}>${edge.to}`).join('|')}`,
		[graph],
	);

	const degreeById = useMemo(() => {
		const degrees = new Map(graph.nodes.map((node) => [node.id, 0]));
		for (const edge of graph.edges) {
			degrees.set(edge.from, (degrees.get(edge.from) ?? 0) + 1);
			degrees.set(edge.to, (degrees.get(edge.to) ?? 0) + 1);
		}
		return degrees;
	}, [graphKey, graph.edges, graph.nodes]);

	useEffect(() => {
		const nextNodes = initialNodes(graph);
		const nextLinks: SimLink[] = graph.edges.map((edge) => ({ source: edge.from, target: edge.to }));
		simNodesRef.current = nextNodes;
		setNodes(nextNodes.map((node) => ({ ...node })));

		simulationRef.current?.stop();
		const simulation = forceSimulation<SimNode>(nextNodes)
			.force(
				'link',
				forceLink<SimNode, SimLink>(nextLinks)
					.id((node) => node.id)
					.distance(88)
					.strength(0.42),
			)
			.force('charge', forceManyBody().strength(-310).distanceMax(230))
			.force('collide', forceCollide<SimNode>().radius((node) => (node.active ? 34 : 27)).strength(0.9))
			.force('center', forceCenter(width / 2, height / 2))
			.force('x', forceX<SimNode>(width / 2).strength(0.035))
			.force('y', forceY<SimNode>(height / 2).strength(0.045))
			.alpha(1)
			.alphaDecay(0.025)
			.velocityDecay(0.34)
			.on('tick', () => {
				for (const node of nextNodes) {
					node.x = Math.min(Math.max(node.x ?? width / 2, padding), width - padding);
					node.y = Math.min(Math.max(node.y ?? height / 2, padding), height - padding);
				}
				setNodes(nextNodes.map((node) => ({ ...node })));
			});

		simulationRef.current = simulation;
		return () => simulation.stop();
	}, [graphKey]);

	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const activeNode = nodes.find((node) => node.active);

	function pointerPosition(event: ReactPointerEvent<SVGGElement>) {
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return { x: width / 2, y: height / 2 };
		return {
			x: ((event.clientX - rect.left) / rect.width) * width,
			y: ((event.clientY - rect.top) / rect.height) * height,
		};
	}

	function handlePointerDown(event: ReactPointerEvent<SVGGElement>, id: string) {
		if (event.button !== 0) return;
		const node = simNodesRef.current.find((item) => item.id === id);
		if (!node) return;
		const point = pointerPosition(event);
		dragRef.current = { id, pointerId: event.pointerId, moved: false };
		node.fx = point.x;
		node.fy = point.y;
		event.currentTarget.setPointerCapture(event.pointerId);
		simulationRef.current?.alphaTarget(0.18).restart();
	}

	function handlePointerMove(event: ReactPointerEvent<SVGGElement>, id: string) {
		const drag = dragRef.current;
		if (!drag || drag.id !== id || drag.pointerId !== event.pointerId) return;
		const node = simNodesRef.current.find((item) => item.id === id);
		if (!node) return;
		const point = pointerPosition(event);
		drag.moved = true;
		node.fx = Math.min(Math.max(point.x, padding), width - padding);
		node.fy = Math.min(Math.max(point.y, padding), height - padding);
	}

	function finishDrag(event: ReactPointerEvent<SVGGElement>, id: string) {
		const drag = dragRef.current;
		if (!drag || drag.id !== id) return;
		const node = simNodesRef.current.find((item) => item.id === id);
		if (node) {
			node.fx = null;
			node.fy = null;
		}
		suppressClickRef.current = drag.moved;
		dragRef.current = null;
		simulationRef.current?.alphaTarget(0);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		window.setTimeout(() => {
			suppressClickRef.current = false;
		}, 0);
	}

	return (
		<div className="force-note-graph">
			<svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="已发布笔记关系图谱">
				<g className="links">
					{graph.edges.map((edge, index) => {
						const source = nodeById.get(edge.from);
						const target = nodeById.get(edge.to);
						if (!source || !target) return null;
						return <line key={`${edge.from}-${edge.to}-${index}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
					})}
				</g>
				<g className="nodes">
					{nodes.map((node) => {
						const degree = degreeById.get(node.id) ?? 0;
						const radius = node.kind === 'tag' ? 4.5 + Math.min(degree, 4) * 0.55 : node.active ? 9 : 5.5 + Math.min(degree, 4) * 0.65;
						const highlighted = hoveredId === node.id || node.active;
						return (
							<a
								href={node.url}
								key={node.id}
								onClick={(event) => {
									if (suppressClickRef.current) event.preventDefault();
								}}
							>
								<g
									className={`node ${node.kind} ${highlighted ? 'is-highlighted' : ''}`}
									onPointerDown={(event) => handlePointerDown(event, node.id)}
									onPointerMove={(event) => handlePointerMove(event, node.id)}
									onPointerUp={(event) => finishDrag(event, node.id)}
									onPointerCancel={(event) => finishDrag(event, node.id)}
									onPointerEnter={() => setHoveredId(node.id)}
									onPointerLeave={() => setHoveredId(null)}
								>
									<circle cx={node.x} cy={node.y} r={radius} className={`${node.kind} ${node.active ? 'active' : ''}`} />
									<text x={(node.x ?? 0) + radius + 5} y={(node.y ?? 0) + 3}>{shortTitle(node.title)}</text>
									<title>{node.title}</title>
								</g>
							</a>
						);
					})}
				</g>
			</svg>
			<div className="graph-status">
				<span>{activeNode?.title}</span>
				<small>{graph.edges.length} connections</small>
			</div>
		</div>
	);
}
