const request = require("request");

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

	static GetTranslation(language, token, attribs = {}) {
		token = token.toString().toLowerCase();

		if (token.startsWith("#")) {
			token = token.slice(1);
		}

		let translation = language[token];
		if (!attribs || Object.keys(attribs).length <= 0) {
			return translation;
		}

		for (let key in attribs) {
			let regex = new RegExp("{[a-z]:" + key + "}", "i");
			translation = translation.replace(regex, this.GetTranslation(language, attribs[key]));
		}

		return translation;
	}
}
