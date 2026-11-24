import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
// src/media/youtube.ts
var DEFAULT_MAX_FILE_SIZE = 26214400;
var DOWNLOAD_TIMEOUT = 6e5;
var ALLOWED_HOSTS = /* @__PURE__ */ new Set([
	"youtube.com",
	"www.youtube.com",
	"m.youtube.com",
	"music.youtube.com",
	"youtu.be"
]);
function validateYouTubeUrl(input) {
	let url;
	try {
		url = new URL(input);
	} catch {
		throw new Error("Invalid YouTube URL.");
	}
	if (url.protocol !== "https:" || url.port || url.username || url.password || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new Error("Please provide a valid YouTube URL.");
	return url.toString();
}
function executeYtDlp(args) {
	return new Promise((resolveOutput, reject) => {
		const child = spawn("yt-dlp", args, { stdio: [
			"ignore",
			"pipe",
			"pipe"
		] });
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		let settled = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			child.kill("SIGTERM");
			setTimeout(() => {
				child.kill("SIGKILL");
			}, 5e3).unref();
		}, DOWNLOAD_TIMEOUT);
		const cleanup = () => clearTimeout(timeout);
		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
			if (stdout.length > 16384) stdout = stdout.slice(-16384);
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
			if (stderr.length > 16384) stderr = stderr.slice(-16384);
		});
		child.on("error", (error) => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(/* @__PURE__ */ new Error(`Unable to start yt-dlp: ${error.message}`));
		});
		child.on("close", (code) => {
			if (settled) return;
			settled = true;
			cleanup();
			if (timedOut) {
				reject(/* @__PURE__ */ new Error("Download timed out."));
				return;
			}
			if (code !== 0) {
				console.error("[yt-dlp]", stderr);
				reject(/* @__PURE__ */ new Error("yt-dlp failed to download the video."));
				return;
			}
			resolveOutput(stdout.trim());
		});
	});
}
async function downloadYouTube(input, format, range, options = {}) {
	const url = validateYouTubeUrl(input);
	const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
	if (!Number.isSafeInteger(maxFileSize) || maxFileSize < 1) throw new Error("Invalid maximum download size.");
	if (range && (!Number.isFinite(range.start) || !Number.isFinite(range.end) || range.start < 0 || range.end <= range.start)) throw new Error("Invalid video time range.");
	const directory = await mkdtemp(join(tmpdir(), "cade-youtube-"));
	try {
		const outputTemplate = join(directory, "%(id)s.%(ext)s");
		const args = [
			"--ignore-config",
			"--no-playlist",
			"--no-warnings",
			"--no-progress",
			"--no-simulate",
			"--max-filesize",
			`${Math.max(1, Math.floor(maxFileSize / 1048576))}M`,
			"--output",
			outputTemplate
		];
		if (format === "video") args.push("--format", "bv*+ba/b", "--merge-output-format", "mp4", "--remux-video", "mp4");
		else args.push("--format", "ba/b", "--extract-audio", "--audio-format", "mp3", "--audio-quality", "0");
		if (range) args.push("--download-sections", `*${range.start}-${range.end}`, "--force-keyframes-at-cuts");
		args.push("--print", "after_move:filepath", "--", url);
		const outputPath = (await executeYtDlp(args)).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1);
		if (!outputPath) throw new Error("No output file was produced.");
		const finalPath = resolve(outputPath);
		if (dirname(finalPath) !== resolve(directory)) throw new Error("Unexpected download output path.");
		const metadata = await stat(finalPath);
		if (!metadata.isFile() || metadata.size === 0) throw new Error("Downloaded file is empty.");
		if (metadata.size > maxFileSize) throw new Error(`File exceeds the configured download limit of ${Math.floor(maxFileSize / 1048576)} MB.`);
		const expectedExtension = format === "video" ? ".mp4" : ".mp3";
		if (extname(finalPath).toLowerCase() !== expectedExtension) throw new Error(`Download did not produce ${expectedExtension}.`);
		return {
			buffer: await readFile(finalPath),
			filename: `cade.${format === "video" ? "mp4" : "mp3"}`,
			format
		};
	} finally {
		await rm(directory, {
			recursive: true,
			force: true
		});
	}
}
// src/routes/api/download/+server.ts
var MAX_BODY_SIZE = 4096;
var MAX_REQUESTS = 8;
var RATE_WINDOW = 6e5;
var MAX_CONCURRENT_DOWNLOADS = 1;
var MAX_WEB_FILE_SIZE = Number(process.env.CADE_WEB_MAX_FILE_SIZE_MB ?? 250) * 1024 * 1024;
var rateLimits = /* @__PURE__ */ new Map();
var activeDownloads = 0;
var ApiError = class extends Error {
	status;
	constructor(status, message) {
		super(message);
		this.status = status;
	}
};
function jsonError(status, error) {
	return new Response(JSON.stringify({ error }), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store"
		}
	});
}
function checkRateLimit(address) {
	const now = Date.now();
	for (const [key, entry] of rateLimits) if (entry.resetAt <= now) rateLimits.delete(key);
	let entry = rateLimits.get(address);
	if (!entry) {
		entry = {
			count: 0,
			resetAt: now + RATE_WINDOW
		};
		rateLimits.set(address, entry);
	}
	if (entry.count >= MAX_REQUESTS) return false;
	entry.count++;
	return true;
}
async function readJson(request) {
	if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApiError(415, "Expected a JSON request.");
	const reader = request.body?.getReader();
	if (!reader) throw new ApiError(400, "Missing request body.");
	const decoder = new TextDecoder();
	let body = "";
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_BODY_SIZE) {
				await reader.cancel();
				throw new ApiError(413, "Request is too large.");
			}
			body += decoder.decode(value, { stream: true });
		}
		body += decoder.decode();
	} finally {
		reader.releaseLock();
	}
	try {
		return JSON.parse(body);
	} catch {
		throw new ApiError(400, "Invalid JSON.");
	}
}
var POST = async ({ request, getClientAddress }) => {
	let address;
	try {
		address = getClientAddress();
	} catch {
		address = "unknown";
	}
	if (!checkRateLimit(address)) return jsonError(429, "Too many requests. Please try again later.");
	if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) return jsonError(503, "The downloader is currently busy.");
	let body;
	try {
		body = await readJson(request);
	} catch (error) {
		if (error instanceof ApiError) return jsonError(error.status, error.message);
		return jsonError(400, "Invalid request.");
	}
	if (typeof body !== "object" || body === null || !("url" in body) || typeof body.url !== "string" || body.url.length > 2048) return jsonError(400, "Please provide a YouTube URL.");
	let url;
	try {
		url = validateYouTubeUrl(body.url);
	} catch {
		return jsonError(400, "Invalid YouTube URL.");
	}
	activeDownloads++;
	try {
		const result = await downloadYouTube(url, "audio", void 0, { maxFileSize: MAX_WEB_FILE_SIZE });
		const file = new Uint8Array(result.buffer);
		return new Response(file, {
			status: 200,
			headers: {
				"Content-Type": "audio/mpeg",
				"Content-Length": String(file.byteLength),
				"Content-Disposition": "attachment; filename=\"cade-download.mp3\"",
				"Cache-Control": "no-store",
				"X-Content-Type-Options": "nosniff"
			}
		});
	} catch (error) {
		console.error("[Web/Get]", error);
		return jsonError(502, "The video could not be downloaded.");
	} finally {
		activeDownloads--;
	}
};
export { POST };

//# sourceMappingURL=_server.ts.js.map