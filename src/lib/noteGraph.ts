import type { CollectionEntry } from 'astro:content';
import { tagSlug } from './tags';

type BlogPost = CollectionEntry<'blog'>;

export type NoteGraphNode = {
	id: string;
	title: string;
	url: string;
	active: boolean;
	kind: 'note' | 'tag';
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
		kind: 'note',
	};
}

export function createNoteGraph(posts: BlogPost[], current: BlogPost, baseUrl: string): NoteGraph {
	const index = indexPosts(posts);
	const nodes = posts.map((post) => nodeFromPost(post, current, baseUrl));
	const tagNodes = new Map<string, NoteGraphNode>();
	for (const post of posts) {
		for (const tag of post.data.tags ?? []) {
			const slug = tagSlug(tag);
			const parts = tag.split(/[\\/]/).filter(Boolean);
			tagNodes.set(slug, {
				id: `tag:${slug}`,
				title: `#${parts.at(-1) ?? tag}`,
				url: `${baseUrl}tags/${slug}/`,
				active: false,
				kind: 'tag',
			});
		}
	}
	for (const tagNode of tagNodes.values()) nodes.push(tagNode);

	const noteIds = new Set(posts.map((post) => post.id));
	const edges: NoteGraphEdge[] = [];
	const edgeKeys = new Set<string>();
	const addEdge = (from: string, to: string) => {
		if (from === to) return;
		const key = `${from}>${to}`;
		if (edgeKeys.has(key)) return;
		edgeKeys.add(key);
		edges.push({ from, to });
	};

	for (const post of posts) {
		for (const link of getWikiLinks(post.body)) {
			const target = index.get(link);
			if (target && noteIds.has(target.id)) addEdge(post.id, target.id);
		}
		for (const tag of post.data.tags ?? []) {
			addEdge(post.id, `tag:${tagSlug(tag)}`);
		}
	}

	return {
		nodes,
		edges,
	};
}
