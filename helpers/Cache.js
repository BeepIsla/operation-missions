import * as fs from "fs/promises";
import * as path from "path";
import got from "got";

export default class Cache {
	static files = {};
	static urls = {};
	static fetchInProgress = [];

	static GetFileNoFetch(name) {
		let file = Cache.files[name];
		if (file) {
			return file;
		}

		throw new Error(`No file found named "${name}"`);
	}

	static async GetFileLocal(name, fileName, parser = null, extraArg = {}) {
		let file = Cache.files[name];
		if (file) {
			return content;
		}

		let filePath = path.join(process.cwd(), "local", fileName);
		let buffer = await fs.readFile(filePath);
		let content = buffer.toString(buffer.readUInt16LE(0) === 65279 ? "ucs2" : "utf8");

		Cache.files[name] = typeof parser === "function" ? await parser(content, extraArg) : content;
		Cache.urls[name] = undefined;
		return Cache.files[name];
	}

	static async GetFile(url, name, parser = null, extraArg = {}) {
		let file = Cache.files[name];
		if (file) {
			return file;
		}

		if (!url) {
			throw new Error("No URL available to fetch from");
		}

		if (Cache.fetchInProgress.includes(name)) {
			await new Promise(p => setTimeout(p, 5000));
			return Cache.GetFile(url, name, parser, extraArg);
		}
		Cache.fetchInProgress.push(name);

		try {
			let content = await got({
				url: url,
				resolveBodyOnly: true
			});
			Cache.files[name] = typeof parser === "function" ? await parser(content, extraArg) : content;
			Cache.urls[name] = url;
			return Cache.files[name];
		} finally {
			let index = Cache.fetchInProgress.indexOf(name);
			if (index >= 0) {
				Cache.fetchInProgress.splice(index, 1);
			}
		}
	}
}
