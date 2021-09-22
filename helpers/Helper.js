const request = require("request");
let english = undefined;

module.exports = class Helper {
	static GetURL(url) {
		return new Promise((resolve, reject) => {
			request(url, (err, res, body) => {
				if (err) {
					reject(err);
					return;
				}

				resolve(body);
			});
		});
	}

	static SetEnglishFallback(translation) {
		let translationTokens = {};
		for (let key in translation.lang.Tokens) {
			translationTokens[key.toLowerCase()] = translation.lang.Tokens[key];
		}
		english = translationTokens;
	}

	static GetTranslation(language, token, attribs = {}) {
		if (!token) {
			return "";
		}
		token = token.toString().toLowerCase();

		if (token.startsWith("#")) {
			token = token.slice(1);
		}

		let translation = language[token];
		if (!translation && english) {
			translation = english[token];
		}

		if (!attribs || Object.keys(attribs).length <= 0) {
			return translation;
		}

		for (let key in attribs) {
			let regex = new RegExp("{[a-z]:" + key + "}", "i");
			translation = translation.replace(regex, this.GetTranslation(language, attribs[key]));
		}

		return translation;
	}

	static commandLine = {
		includes(arg) {
			return process.argv.join(" ").toLowerCase().includes(arg.toLowerCase());
		},
		get(arg) {
			let index = process.argv.map(a => a.toLowerCase()).indexOf(arg.toLowerCase());
			if (index <= -1) {
				return undefined;
			}

			return process.argv[index + 1];
		}
	}
}
