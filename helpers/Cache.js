const fs = require("fs");
const path = require("path");
const Helper = require("./Helper.js");

module.exports = class Cache {
	static files = {};
	static urls = {};
	static parsers = {};
	static fetchInProgress = [];

	static GetFileLocal(name, fileName, maxTime = 60 * 60 * 1000, parser = null, extraArg = []) {
		return new Promise(async (resolve, reject) => {
			let file = this.files[name];
			if (file) {
				let difference = Date.now() - file.time;
				if (difference <= maxTime) {
					let content = file.content;
					if (typeof parser === "function") {
						try {
							content = await parser(content, ...extraArg);
						} catch (err) {
							reject(err);
							return;
						}
					}

					resolve(content);
					return;
				}
			}

			let filePath = path.join(__dirname, "..", "local", fileName);
			if (!fs.existsSync(filePath)) {
				reject(new Error("Failed to find file in path \"" + filePath + "\""));
				return;
			}

			let buffer = fs.readFileSync(filePath);
			let content = buffer.toString(buffer.readUInt16LE(0) === 65279 ? "ucs2" : "utf8");

			this.files[name] = {
				time: Date.now(),
				content: content
			};
			this.parsers[name] = parser;
			this.urls[name] = undefined;

			if (typeof parser === "function") {
				try {
					content = await parser(content);
				} catch (err) {
					reject(err);
					return;
				}
			}

			resolve(content);
		});
	}

	static GetFile(url, name, maxTime = 60 * 60 * 1000, parser = null, extraArg = []) {
		return new Promise(async (resolve, reject) => {
			if (arguments.length === 1 || arguments.length === 2) {
				if (arguments.length === 2) {
					maxTime = name;
				}

				name = url;
				url = this.urls[name];
				parser = this.parsers[name];
			}

			let file = this.files[name];
			if (file) {
				let difference = Date.now() - file.time;
				if (difference <= maxTime) {
					let content = file.content;
					if (typeof parser === "function") {
						try {
							content = await parser(content, ...extraArg);
						} catch (err) {
							reject(err);
							return;
						}
					}

					resolve(content);
					return;
				}
			}

			if (!url) {
				reject(new Error("No URL available to fetch from"));
				return;
			}

			if (this.fetchInProgress.includes(name)) {
				setTimeout(() => {
					this.GetFile(url, name, maxTime, parser).then(resolve).catch(reject);
				}, 2000);
				return;
			}
			this.fetchInProgress.push(name);

			Helper.GetURL(url).then(async (content) => {
				this.files[name] = {
					time: Date.now(),
					content: content
				};
				this.parsers[name] = parser;
				this.urls[name] = url;

				if (typeof parser === "function") {
					try {
						content = await parser(content);
					} catch (err) {
						reject(err);
						return;
					}
				}

				resolve(content);
			}).catch((err) => {
				reject(err);
			}).finally(() => {
				let index = this.fetchInProgress.indexOf(name);
				if (index >= 0) {
					this.fetchInProgress.splice(index, 1);
				}
			});
		});
	}
};
