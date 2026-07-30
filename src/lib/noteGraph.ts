import type { CollectionEntry } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

export type NoteGraphNode = {
	id: string;
	title: string;
	url: string;
	active: boolean;
};

export type NoteGraphEdge = {
	from: string;
	to: string;
};

export type NoteGraph = {
	nodes: NoteGraphNode[];
	edges: NoteGraphEdge[];
};

function stripMdExtension(value: string) {
	return value.replace(/\.md$/i, '');
}

function normalizeKey(value: string) {
	return stripMdExtension(value).replaceAll('\\', '/').replace(/^\/+/, '').trim().toLowerCase();
}

function getWikiLinks(body = '') {
	const links = new Set<string>();
	const pattern = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
	let match;

	while ((match = pattern.exec(body)) !== null) {
		links.add(normalizeKey(match[1]));
	}

	return [...links];
}

function postUrl(post: BlogPost, baseUrl: string) {
	return `${baseUrl}blog/${post.id}/`;
}

function indexPosts(posts: BlogPost[]) {
	const index = new Map<string, BlogPost>();

	for (const post of posts) {
		const sourcePath = post.data.sourcePath;
		if (sourcePath) {
			index.set(normalizeKey(sourcePath), post);
			index.set(normalizeKey(sourcePath.split('/').at(-1) ?? sourcePath), post);
		}
		index.set(normalizeKey(post.data.title), post);
		index.set(normalizeKey(post.id), post);
	}

	return index;
}

function nodeFromPost(post: BlogPost, current: BlogPost, baseUrl: string): NoteGraphNode {
	return {
		id: post.id,
		title: post.data.title,
		url: postUrl(post, baseUrl),
		active: post.id === current.id,
	};
}

export function createNoteGraph(posts: BlogPost[], current: BlogPost, baseUrl: string): NoteGraph {
	const index = indexPosts(posts);
	const nodes = posts.map((post) => nodeFromPost(post, current, baseUrl));
	const nodeIds = new Set(nodes.map((node) => node.id));
	const edges: NoteGraphEdge[] = [];

	for (const post of posts) {
		for (const link of getWikiLinks(post.body)) {
			const target = index.get(link);
			if (target && nodeIds.has(target.id)) {
				edges.push({ from: post.id, to: target.id });
			}
		}
	}

	return {
		nodes,
		edges,
	};
}
