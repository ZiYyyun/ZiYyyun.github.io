import type { CollectionEntry } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

export type TagSummary = {
	name: string;
	slug: string;
	count: number;
	posts: {
		title: string;
		url: string;
		description: string;
	}[];
};

export function tagSlug(value: string) {
	return (
		value
			.normalize('NFKD')
			.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase() || 'tag'
	);
}

function extractTags(body = '') {
	const tags = new Set<string>();
	let inFence = false;

	for (const line of body.split(/\r?\n/)) {
		if (line.trim().startsWith('```')) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		const trimmed = line.trim();
		if (!/^#[\p{Letter}\p{Number}_/-]+(?:\s+#[\p{Letter}\p{Number}_/-]+)*$/u.test(trimmed)) continue;

		const matches = trimmed.matchAll(/#([\p{Letter}\p{Number}_/-]+)/gu);
		for (const match of matches) {
			const tag = match[1];
			if (tag.toLowerCase() !== 'blog') tags.add(tag);
		}
	}

	return [...tags];
}

export function getTagSummaries(posts: BlogPost[], baseUrl: string): TagSummary[] {
	const tagMap = new Map<string, TagSummary>();

	for (const post of posts) {
		const tags = post.data.tags?.length ? post.data.tags : extractTags(post.body);

		for (const tag of tags) {
			const summary = tagMap.get(tag) ?? { name: tag, slug: tagSlug(tag), count: 0, posts: [] };
			summary.count += 1;
			summary.posts.push({
				title: post.data.title,
				url: `${baseUrl}blog/${post.id}/`,
				description: post.data.description,
			});
			tagMap.set(tag, summary);
		}
	}

	return [...tagMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}
