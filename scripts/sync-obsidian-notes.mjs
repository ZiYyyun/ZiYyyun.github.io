import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoUrl = process.env.OBSIDIAN_REPO_URL ?? 'https://github.com/ZiYyyun/ZiYyun-ObsidianUnivrse.git';
const branch = process.env.OBSIDIAN_REPO_BRANCH ?? 'main';
const localVaultPath = process.env.OBSIDIAN_VAULT_PATH;
const cacheDir = resolve(root, '.cache', 'obsidian-vault');
const outputDir = resolve(root, 'src', 'content', 'blog');
const manifestNames = ['blog_pages.database', 'blog_pages.md', 'blog_pages.base'];
const dryRun = process.env.OBSIDIAN_SYNC_DRY_RUN === '1';

function run(command, args, options = {}) {
	execFileSync(command, args, { stdio: 'inherit', ...options });
}

function getVaultPath() {
	if (localVaultPath) {
		const vault = resolve(localVaultPath);
		if (!existsSync(vault) || !statSync(vault).isDirectory()) {
			throw new Error(`OBSIDIAN_VAULT_PATH does not exist or is not a directory: ${vault}`);
		}
		return vault;
	}

	rmSync(cacheDir, { recursive: true, force: true });
	mkdirSync(dirname(cacheDir), { recursive: true });
	run('git', ['clone', '--depth', '1', '--branch', branch, repoUrl, cacheDir]);
	return cacheDir;
}

function walkFiles(dir, predicate, files = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === '.git' || entry.name === '.obsidian' || entry.name === 'node_modules') continue;
			walkFiles(fullPath, predicate, files);
		} else if (predicate(fullPath)) {
			files.push(fullPath);
		}
	}
	return files;
}

function normalizePath(path) {
	return path.replaceAll('\\', '/').replace(/^\/+/, '').trim();
}

function stripMdExtension(value) {
	return value.replace(/\.md$/i, '');
}

function findManifest(vaultPath) {
	const manifests = walkFiles(vaultPath, (file) => manifestNames.includes(basename(file)));
	return manifests[0];
}

function parseManifest(content) {
	const entries = new Set();
	const wikiLinkPattern = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
	let match;

	while ((match = wikiLinkPattern.exec(content)) !== null) {
		entries.add(normalizePath(match[1]));
	}

	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine
			.replace(/^\s*[-*]\s+/, '')
			.replace(/^\s*\d+\.\s+/, '')
			.trim();

		if (!line || line.startsWith('#') || line.startsWith('//')) continue;
		if (line.includes('[[')) continue;

		const markdownLink = line.match(/\[[^\]]+\]\(([^)]+\.md)\)/i);
		const value = markdownLink?.[1] ?? line;
		if (value.endsWith('.md') || value.includes('/')) {
			entries.add(normalizePath(value));
		}
	}

	return [...entries];
}

function buildNoteIndex(vaultPath) {
	const files = walkFiles(vaultPath, (file) => extname(file).toLowerCase() === '.md');
	const byRelativePath = new Map();
	const byName = new Map();

	for (const file of files) {
		const relativePath = normalizePath(relative(vaultPath, file));
		const withoutExtension = stripMdExtension(relativePath);
		const fileName = stripMdExtension(basename(file));

		byRelativePath.set(relativePath.toLowerCase(), file);
		byRelativePath.set(withoutExtension.toLowerCase(), file);

		const nameKey = fileName.toLowerCase();
		byName.set(nameKey, [...(byName.get(nameKey) ?? []), file]);
	}

	return { byRelativePath, byName };
}

function resolveNote(entry, index) {
	const normalized = normalizePath(entry);
	const withExtension = normalized.endsWith('.md') ? normalized : `${normalized}.md`;
	const exact =
		index.byRelativePath.get(normalized.toLowerCase()) ?? index.byRelativePath.get(withExtension.toLowerCase());
	if (exact) return exact;

	const matches = index.byName.get(stripMdExtension(basename(normalized)).toLowerCase()) ?? [];
	if (matches.length === 1) return matches[0];
	if (matches.length > 1) {
		throw new Error(`Ambiguous note name "${entry}". Use a full path in blog_pages.database.`);
	}

	throw new Error(`Cannot find note from blog_pages.database: ${entry}`);
}

function slugify(value) {
	return normalizePath(value)
		.replace(/\.md$/i, '')
		.split('/')
		.filter(Boolean)
		.map((part) =>
			part
				.normalize('NFKD')
				.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
				.replace(/^-+|-+$/g, '')
				.toLowerCase(),
		)
		.filter(Boolean)
		.join('--');
}

function parseFrontmatter(content) {
	if (!content.startsWith('---')) return { frontmatter: null, body: content };
	const end = content.indexOf('\n---', 3);
	if (end === -1) return { frontmatter: null, body: content };
	return {
		frontmatter: content.slice(3, end).trim(),
		body: content.slice(end + 4).replace(/^\r?\n/, ''),
	};
}

function hasFrontmatterField(frontmatter, field) {
	return new RegExp(`^${field}:`, 'm').test(frontmatter ?? '');
}

function yamlQuote(value) {
	return `'${value.replaceAll("'", "''")}'`;
}

function getFileDate(file) {
	return statSync(file).mtime.toISOString().slice(0, 10);
}

function toBlogMarkdown(file, vaultPath) {
	const original = readFileSync(file, 'utf8');
	const { frontmatter, body } = parseFrontmatter(original);
	const relativePath = normalizePath(relative(vaultPath, file));
	const title = stripMdExtension(basename(file));
	const generatedFields = [];

	if (!hasFrontmatterField(frontmatter, 'title')) generatedFields.push(`title: ${yamlQuote(title)}`);
	if (!hasFrontmatterField(frontmatter, 'description')) {
		generatedFields.push(`description: ${yamlQuote(`来自 Obsidian 的笔记：${title}`)}`);
	}
	if (!hasFrontmatterField(frontmatter, 'pubDate')) generatedFields.push(`pubDate: '${getFileDate(file)}'`);
	generatedFields.push(`sourcePath: ${yamlQuote(relativePath)}`);

	const mergedFrontmatter = [frontmatter, ...generatedFields].filter(Boolean).join('\n');
	return `---\n${mergedFrontmatter}\n---\n\n${body.trim()}\n`;
}

function syncNotes() {
	const vaultPath = getVaultPath();
	const manifest = findManifest(vaultPath);

	if (!manifest) {
		console.warn(
			`No publish manifest found. Create blog_pages.database in the Obsidian repo and add entries like [[I_知识节点/Example Note]].`,
		);
		return;
	}

	const entries = parseManifest(readFileSync(manifest, 'utf8'));
	if (entries.length === 0) {
		console.warn(`Publish manifest is empty: ${manifest}`);
		return;
	}

	const index = buildNoteIndex(vaultPath);
	const files = entries.map((entry) => resolveNote(entry, index));

	if (dryRun) {
		for (const file of files) {
			const relativePath = normalizePath(relative(vaultPath, file));
			const slug = slugify(relativePath);
			console.log(`[dry-run] ${relativePath} -> src/content/blog/${slug}.md`);
		}
		console.log(`[dry-run] ${files.length} note(s) selected from ${relative(vaultPath, manifest).split(sep).join('/')}.`);
		return;
	}

	rmSync(outputDir, { recursive: true, force: true });
	mkdirSync(outputDir, { recursive: true });

	for (const file of files) {
		const relativePath = normalizePath(relative(vaultPath, file));
		const slug = slugify(relativePath);
		const outputFile = join(outputDir, `${slug}.md`);
		writeFileSync(outputFile, toBlogMarkdown(file, vaultPath), 'utf8');
		console.log(`Synced ${relativePath} -> ${relative(root, outputFile).split(sep).join('/')}`);
	}

	console.log(`Synced ${files.length} note(s) from ${relative(vaultPath, manifest).split(sep).join('/')}.`);
}

syncNotes();
