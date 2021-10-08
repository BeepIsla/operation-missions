export default class Translation {
	constructor(lang, eng) {
		this.language = this.NormalizeLanguage(lang.lang.Tokens);
		this.english = this.NormalizeLanguage(eng.lang.Tokens);
	}

	NormalizeLanguage(tokens) {
		let obj = {};
		for (let key in tokens) {
			obj[key.toLowerCase()] = Array.isArray(tokens[key]) ? tokens[key][0] : tokens[key];
		}
		return obj;
	}

	Get(token, attribs = {}) {
		if (!token) {
			return "";
		}
		token = token.toString().toLowerCase();

		if (token.startsWith("#")) {
			token = token.slice(1);
		}

		let translation = this.language[token];
		if (!translation) {
			translation = this.english[token];
		}

		if (!attribs || Object.keys(attribs).length <= 0) {
			return translation;
		}

		for (let key in attribs) {
			let regex = new RegExp("{[a-z]:" + key + "}", "i");
			translation = translation.replace(regex, attribs[key]);
		}

		return translation;
	}
}
