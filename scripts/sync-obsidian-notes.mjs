import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	copyFileSync,
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
const assetOutputDir = resolve(root, 'public', 'obsidian-assets');
const manifestNames = ['blog_pages.database', 'blog_pages.md', 'blog_pages.base', 'blog_pages', 'blog-pages'];
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
	const manifests = walkFiles(vaultPath, (file) => {
		const name = basename(file).toLowerCase();
		const withoutExtension = name.replace(/\.[^.]+$/, '');
		return manifestNames.includes(name) || manifestNames.includes(withoutExtension);
	});
	return manifests[0];
}

function parseBaseTags(content) {
	const tags = new Set();
	const tagPattern = /file\.tags\.contains\((["'])(#?[^"']+)\1\)/g;
	let match;

	while ((match = tagPattern.exec(content)) !== null) {
		tags.add(match[2].replace(/^#/, '').trim());
	}

	return [...tags].filter(Boolean);
}

function fileHasTag(file, tag) {
	const content = readFileSync(file, 'utf8');
	const bareTag = tag.replace(/^#/, '');
	const escaped = bareTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const tagPattern = new RegExp(`(^|\\s)#${escaped}(?=\\s|$)`, 'm');
	const yamlTagPattern = new RegExp(`(^|[\\s\\[,-])#?${escaped}(?=$|[\\s\\],])`, 'm');
	const { frontmatter, body } = parseFrontmatter(content);

	return tagPattern.test(body) || (frontmatter ? yamlTagPattern.test(frontmatter) : false);
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

function buildAssetIndex(vaultPath) {
	const files = walkFiles(vaultPath, (file) => extname(file).toLowerCase() !== '.md');
	const byRelativePath = new Map();
	const byName = new Map();

	for (const file of files) {
		const relativePath = normalizePath(relative(vaultPath, file));
		byRelativePath.set(relativePath.toLowerCase(), file);
		byName.set(basename(file).toLowerCase(), file);
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

function slugifyAsset(value) {
	const extension = extname(value).toLowerCase();
	const name = value.slice(0, -extension.length);
	return `${slugify(name) || 'asset'}${extension}`;
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

function yamlStringList(values) {
	return `[${values.map((value) => yamlQuote(value)).join(', ')}]`;
}

function getFileDate(file, vaultPath) {
	try {
		const relativePath = normalizePath(relative(vaultPath, file));
		const output = execFileSync('git', ['-C', vaultPath, 'log', '-1', '--format=%cs', '--', relativePath], {
			encoding: 'utf8',
		}).trim();

		if (output) return output;
	} catch {
		// Fall back to the filesystem timestamp when the vault is not a git checkout.
	}

	return statSync(file).mtime.toISOString().slice(0, 10);
}

function resolveAsset(target, assetIndex) {
	const normalized = normalizePath(target);
	return assetIndex.byRelativePath.get(normalized.toLowerCase()) ?? assetIndex.byName.get(basename(normalized).toLowerCase());
}

function buildPublishedLinkIndex(files, vaultPath) {
	const publishedLinks = new Map();

	for (const file of files) {
		const relativePath = normalizePath(relative(vaultPath, file));
		const slug = slugify(relativePath);
		const url = `/blog/${slug}/`;
		publishedLinks.set(stripMdExtension(relativePath).toLowerCase(), url);
		publishedLinks.set(stripMdExtension(basename(file)).toLowerCase(), url);
	}

	return publishedLinks;
}

function transformObsidianBody(body, assetIndex, copiedAssets, publishedLinks) {
	return body
		.split(/\r?\n/)
		.filter((line) => !isTagOnlyLine(line))
		.join('\n')
		.replace(/!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g, (_match, target) => {
			const asset = resolveAsset(target, assetIndex);
			if (!asset) return '';

			const fileName = slugifyAsset(relative(dirname(asset), asset));
			const outputPath = join(assetOutputDir, fileName);
			copyFileSync(asset, outputPath);
			copiedAssets.add(fileName);
			return `![${basename(target)}](/obsidian-assets/${encodeURI(fileName)})`;
		})
		.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (_match, target, alias) => {
			const label = alias || basename(target);
			const key = normalizePath(target).toLowerCase();
			const url = publishedLinks.get(stripMdExtension(key));
			const marker = `<!-- [[${target}]] -->`;
			return url ? `[${label}](${url})${marker}` : `${label}${marker}`;
		});
}

function isTagOnlyLine(line) {
	return /^#[\p{Letter}\p{Number}_/-]+(?:\s+#[\p{Letter}\p{Number}_/-]+)*$/u.test(line.trim());
}

function extractObsidianTags(body) {
	const tags = new Set();
	let inFence = false;

	for (const line of body.split(/\r?\n/)) {
		if (line.trim().startsWith('```')) {
			inFence = !inFence;
			continue;
		}
		if (inFence || !isTagOnlyLine(line)) continue;

		for (const match of line.trim().matchAll(/#([\p{Letter}\p{Number}_/-]+)/gu)) {
			const tag = match[1].trim();
			if (tag && tag.toLowerCase() !== 'blog') tags.add(tag);
		}
	}

	return [...tags];
}

function toBlogMarkdown(file, vaultPath, assetIndex, copiedAssets, publishedLinks) {
	const original = readFileSync(file, 'utf8');
	const { frontmatter, body } = parseFrontmatter(original);
	const relativePath = normalizePath(relative(vaultPath, file));
	const title = stripMdExtension(basename(file));
	const generatedFields = [];

	if (!hasFrontmatterField(frontmatter, 'title')) generatedFields.push(`title: ${yamlQuote(title)}`);
	if (!hasFrontmatterField(frontmatter, 'description')) {
		generatedFields.push(`description: ${yamlQuote(`Obsidian note: ${title}`)}`);
	}
	if (!hasFrontmatterField(frontmatter, 'pubDate')) generatedFields.push(`pubDate: '${getFileDate(file, vaultPath)}'`);
	generatedFields.push(`sourcePath: ${yamlQuote(relativePath)}`);
	const tags = extractObsidianTags(body);
	if (tags.length > 0 && !hasFrontmatterField(frontmatter, 'tags')) {
		generatedFields.push(`tags: ${yamlStringList(tags)}`);
	}

	const mergedFrontmatter = [frontmatter, ...generatedFields].filter(Boolean).join('\n');
	const transformedBody = transformObsidianBody(body, assetIndex, copiedAssets, publishedLinks);
	return `---\n${mergedFrontmatter}\n---\n\n${transformedBody.trim()}\n`;
}

function syncNotes() {
	const vaultPath = getVaultPath();
	const manifest = findManifest(vaultPath);

	if (!manifest) {
		console.warn(
			`No publish manifest found. Create blog_pages.database in the Obsidian repo and add entries like [[I_knowledge/Example Note]].`,
		);
		return;
	}

	const manifestContent = readFileSync(manifest, 'utf8');
	const baseTags = parseBaseTags(manifestContent);
	const entries = parseManifest(manifestContent);
	if (entries.length === 0 && baseTags.length === 0) {
		console.warn(`Publish manifest is empty: ${manifest}`);
		return;
	}

	const index = buildNoteIndex(vaultPath);
	const assetIndex = buildAssetIndex(vaultPath);
	const files = [
		...entries.map((entry) => resolveNote(entry, index)),
		...baseTags.flatMap((tag) =>
			walkFiles(vaultPath, (file) => extname(file).toLowerCase() === '.md' && fileHasTag(file, tag)),
		),
	];
	const uniqueFiles = [...new Set(files)];

	if (dryRun) {
		for (const file of uniqueFiles) {
			const relativePath = normalizePath(relative(vaultPath, file));
			const slug = slugify(relativePath);
			console.log(`[dry-run] ${relativePath} -> src/content/blog/${slug}.md`);
		}
		console.log(`[dry-run] ${uniqueFiles.length} note(s) selected from ${relative(vaultPath, manifest).split(sep).join('/')}.`);
		return;
	}

	rmSync(outputDir, { recursive: true, force: true });
	rmSync(assetOutputDir, { recursive: true, force: true });
	mkdirSync(outputDir, { recursive: true });
	mkdirSync(assetOutputDir, { recursive: true });
	const copiedAssets = new Set();
	const publishedLinks = buildPublishedLinkIndex(uniqueFiles, vaultPath);

	for (const file of uniqueFiles) {
		const relativePath = normalizePath(relative(vaultPath, file));
		const slug = slugify(relativePath);
		const outputFile = join(outputDir, `${slug}.md`);
		writeFileSync(outputFile, toBlogMarkdown(file, vaultPath, assetIndex, copiedAssets, publishedLinks), 'utf8');
		console.log(`Synced ${relativePath} -> ${relative(root, outputFile).split(sep).join('/')}`);
	}

	console.log(`Synced ${uniqueFiles.length} note(s) from ${relative(vaultPath, manifest).split(sep).join('/')}.`);
	console.log(`Copied ${copiedAssets.size} asset(s).`);
}

syncNotes();
