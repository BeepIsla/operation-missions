export default class CommandLine {
	static Includes(arg) {
		return process.argv.join(" ").toLowerCase().includes(arg.toLowerCase());
	}

	static Get(arg) {
		let index = process.argv.map(a => a.toLowerCase()).indexOf(arg.toLowerCase());
		if (index <= -1) {
			return undefined;
		}

		return process.argv[index + 1];
	}
}
