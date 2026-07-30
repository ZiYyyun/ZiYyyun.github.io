import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NoteGraph } from '../lib/noteGraph';

type Props = {
	graph: NoteGraph;
};

type SimNode = NoteGraph['nodes'][number] & {
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
};

type SimLink = {
	source: string | SimNode;
	target: string | SimNode;
};

const width = 280;
const height = 260;

export default function ForceNoteGraph({ graph }: Props) {
	const [nodes, setNodes] = useState<SimNode[]>([]);
	const [links, setLinks] = useState<SimLink[]>([]);
	const simulationRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);

	const graphKey = useMemo(
		() => `${graph.nodes.map((node) => node.id).join('|')}::${graph.edges.map((edge) => `${edge.from}>${edge.to}`).join('|')}`,
		[graph],
	);

	useEffect(() => {
		const nextNodes: SimNode[] = graph.nodes.map((node, index) => ({
			...node,
			x: width / 2 + Math.cos(index) * 32,
			y: height / 2 + Math.sin(index) * 32,
		}));
		const nextLinks: SimLink[] = graph.edges.map((edge) => ({ source: edge.from, target: edge.to }));

		simulationRef.current?.stop();
		const simulation = forceSimulation<SimNode>(nextNodes)
			.force(
				'link',
				forceLink<SimNode, SimLink>(nextLinks)
					.id((node) => node.id)
					.distance(72)
					.strength(0.55),
			)
			.force('charge', forceManyBody().strength(-210))
			.force('collide', forceCollide<SimNode>().radius((node) => (node.active ? 24 : 18)))
			.force('center', forceCenter(width / 2, height / 2))
			.alpha(0.95)
			.alphaDecay(0.035)
			.on('tick', () => {
				setNodes(nextNodes.map((node) => ({ ...node })));
				setLinks(nextLinks.map((link) => ({ ...link })));
			});

		simulationRef.current = simulation;
		return () => simulation.stop();
	}, [graphKey, graph.nodes, graph.edges]);

	const nodeById = new Map(nodes.map((node) => [node.id, node]));

	return (
		<div className="force-note-graph">
			<svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="已发布笔记关系图谱">
				<g className="links">
					{links.map((link, index) => {
						const source = typeof link.source === 'string' ? nodeById.get(link.source) : link.source;
						const target = typeof link.target === 'string' ? nodeById.get(link.target) : link.target;
						if (!source || !target) return null;
						return (
							<line
								key={`${source.id}-${target.id}-${index}`}
								x1={source.x}
								y1={source.y}
								x2={target.x}
								y2={target.y}
							/>
						);
					})}
				</g>
				<g className="nodes">
					{nodes.map((node) => (
						<a href={node.url} key={node.id}>
							<circle cx={node.x} cy={node.y} r={node.active ? 9 : 6} className={node.active ? 'active' : ''} />
							<title>{node.title}</title>
						</a>
					))}
				</g>
			</svg>
			<ul>
				{graph.nodes.map((node) => (
					<li className={node.active ? 'active' : ''} key={node.id}>
						<a href={node.url}>{node.title}</a>
					</li>
				))}
			</ul>
		</div>
	);
}
