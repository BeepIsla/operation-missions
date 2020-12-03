const fs = require("fs");
const path = require("path");
const VDF = require("vdf-parser");
const cheerio = require("cheerio");
const Cache = require("./helpers/Cache.js");
const Helper = require("./helpers/Helper.js");
const Download = require("./helpers/Download.js");

let urls = {
	itemsGame: "https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/scripts/items/items_game.txt",
	translation: "https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/resource/" + (Helper.commandLine.get("--language") || "csgo_english.txt"),
	english: "https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/resource/csgo_english.txt",
	gamemodes: "https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/gamemodes.txt"
};

function customParser(data) {
	// We do this because our parser has issues with things like this, they aren't needed anyways
	data = data.replace(/^.*"\d+"\s+{\s+"\w+"\s+"[#\w]+"\s+"\w+"\s+\".*"\s+}.*$/gmi, "");
	data = data.replace(/^.*"\w+"\s+{\s+\"kills"\s+"\d+"\s+}.*$/gmi, "");
	return VDF.parse(data);
}

(async () => {
	if (Helper.commandLine.includes("--local")) {
		await Promise.all(Object.keys(urls).map((key) => {
			let fileName = urls[key].split("/").pop();
			return Cache.GetFileLocal(key, fileName, 60 * 60 * 1000, key === "gamemodes" ? customParser : VDF.parse, [false]);
		}));
	} else {
		if (!fs.existsSync("cfg")) {
			fs.mkdirSync("cfg");
		}

		console.log("Fetching files...");

		// Fetch files
		await Promise.all(Object.keys(urls).map((key) => {
			return Cache.GetFile(urls[key], key, 60 * 60 * 1000, key === "gamemodes" ? customParser : VDF.parse, [false]);
		}));

		await Download.Delete();
		await Download.Get();
	}

	console.log("Building...");

	let itemsGame = await Cache.GetFile("itemsGame");
	let translation = await Cache.GetFile("translation");
	let english = await Cache.GetFile("english");
	let gamemodes = await Cache.GetFile("gamemodes");

	let operation = itemsGame.items_game.seasonaloperations.find(o => o["9"])["9"];
	let questDefinitions = itemsGame.items_game.quest_definitions;
	let translationTokens = {};
	let mapgroups = gamemodes["GameModes.txt"].mapgroups;
	let maps = gamemodes["GameModes.txt"].maps;
	let maptypes = gamemodes["GameModes.txt"].maptypes;

	// Force translation tokens to be lowercase
	for (let key in translation.lang.Tokens) {
		translationTokens[key.toLowerCase()] = translation.lang.Tokens[key];
	}

	Helper.SetEnglishFallback(english);

	// Get weekly cards
	let cards = operation.quest_mission_card.map((card) => {
		let quests = [];
		let parts = card.quests.split(",");
		for (let part of parts) {
			if (part === "locked") {
				quests = "locked";
				continue;
			}

			if (part.includes("-")) {
				let range = part.split("-");
				let min = Number(range[0]);
				let max = Number(range[1]);
				for (let i = min; i <= max; i++) {
					quests.push(Number(i));
				}
			} else {
				quests.push(Number(part));
			}
		}
		card.quests = quests;
		return card;
	});

	// Get quests for each card
	for (let card of cards) {
		if (card.quests === "locked") {
			continue;
		}

		card.questIDs = card.quests;
		card.quests = card.questIDs.map((id) => {
			let quest = questDefinitions.find((quests) => {
				return quests[id.toString()];
			});

			if (quest) {
				return quest[id.toString()];
			}

			return undefined;
		});
	}
	console.log(cards);

	// Parse cards to look pretty for HTML
	const $ = cheerio.load("<ul id=\"hierarchy\"></ul>");

	for (let i = 0; i < cards.length; i++) {
		let card = cards[i];

		let cardName = Helper.GetTranslation(translationTokens, card.name);

		$("#hierarchy").append(cheerio.parseHTML("<li><span class=\"caret\">Week " + (i + 1) + ": " + cardName + "</span></li>"));
		$("#hierarchy > li").last().append(cheerio.parseHTML("<ul class=\"nested\"></ul>"));

		if (card.quests === "locked") {
			$("#hierarchy > li").last().find("ul").last().append(cheerio.parseHTML("<li><span class=\"questUnavailable\">Quests Unavailable</span></li>"));
		} else {
			for (let j = 0; j < card.quests.length; j++) {
				let quest = card.quests[j];

				let questName = Helper.GetTranslation(translationTokens, quest.loc_name);
				let questDescRaw = Helper.GetTranslation(translationTokens, quest.loc_description);
				let questDesc = Helper.GetTranslation(translationTokens, quest.loc_description);
				let questMode = Helper.GetTranslation(translationTokens, "SFUI_GameMode_" + quest.gamemode);
				let questReward = Helper.GetTranslation(translationTokens, "Quest_OperationalPoints_" + quest.operational_points);

				let location = quest.mapgroup ?
					mapgroups[quest.mapgroup] :
					quest.map ?
						maps[quest.map] :
						undefined;
				let questLocation = undefined;
				if (location) {
					questLocation = Helper.GetTranslation(translationTokens, location.nameID);
				}

				// Prettify description
				let strInd = 0;
				while (true) {
					let part = questDesc.slice(strInd);
					let match = part.match(/{(?<type>[a-z]):(?<name>\w+)}/, i);
					if (!match) {
						break;
					}

					strInd = questDesc.indexOf(match[0], strInd);

					let type = match.groups.type;
					let loc = match.groups.name;
					let putIn = undefined;

					switch (loc) {
						case "points": {
							putIn = quest.points;
							break;
						}
						case "weapon": {
							if (quest.string_tokens && quest.string_tokens.weapon) {
								putIn = Helper.GetTranslation(translationTokens, quest.string_tokens.weapon);
							} else {
								let weapon = quest.expression.match(/%weapon_(?<weapon>\w+)%/i);
								if (weapon) {
									putIn = Helper.GetTranslation(translationTokens, "SFUI_WPNHUD_" + weapon.groups.weapon);
								} else {
									putIn = Helper.GetTranslation(translationTokens, "quest_guardian_empty");
								}
							}

							// Still no translation? Try and directly parse it out of the expression
							if (!putIn) {
								let wepMatch = quest.expression.match(/%weapon_\w+%/gi);
								if (wepMatch) {
									putIn = wepMatch.map((weapon) => {
										let rawWeapon = weapon.replace(/%/g, "");
										if (Array.isArray(itemsGame.items_game.prefabs)) {
											let prefabs = {};
											for (let k = 0; k < itemsGame.items_game.prefabs.length; k++) {
												for (let key in itemsGame.items_game.prefabs[k]) {
													prefabs[key] = itemsGame.items_game.prefabs[k][key];
												}
											}

											let prefab = prefabs[rawWeapon.toLowerCase() + "_prefab"];
											if (prefab) {
												rawWeapon = prefab.item_name;
											} else {
												// Scuffed?
												rawWeapon = "quest_LoadoutSlot_" + rawWeapon.toLowerCase().replace("weapon_", "");
											}
										} else {
											let prefab = itemsGame.items_game.prefabs[rawWeapon.toLowerCase() + "_prefab"];
											rawWeapon = prefab.item_name;
										}
										return Helper.GetTranslation(translationTokens, rawWeapon);
									}).join(", ").replace(/,(?=[\w-\s\+]+$)/i, " or ");
								}
							}
							break;
						}
						case "gamemode": {
							putIn = Helper.GetTranslation(translationTokens, "SFUI_GameMode_" + quest.gamemode);
							if (!putIn) {
								putIn = Helper.GetTranslation(translationTokens, maptypes[quest.gamemode].nameID);
							}
							break;
						}
						case "location": {
							putIn = Helper.GetTranslation(translationTokens, quest.map ? maps[quest.map].nameID : mapgroups[quest.mapgroup].nameID);
							break;
						}
						case "kills": {
							let configFile = quest.server_exec.match(/^execwithwhitelist\s+(?<config>[\w\.]+).*$/i);
							if (configFile) {
								let configPath = path.join(__dirname, "cfg", configFile.groups.config);
								if (fs.existsSync(configPath)) {
									let configContent = fs.readFileSync(configPath).toString();
									let amountMatch = configContent.match(/^mp_guardian_special_kills_needed\s+(?<amount>\d+).*$/im);
									if (amountMatch) {
										putIn = amountMatch.groups.amount;
									}
								}
							}
							break;
						}
						case "target": {
							putIn = Helper.GetTranslation(translationTokens, quest.string_tokens.target);
							break;
						}
						case "extraequip0":
						case "extraequip1":
						case "extraequip2": {
							let configFile = quest.server_exec.match(/^execwithwhitelist\s+(?<config>[\w\.]+).*$/i);
							if (configFile) {
								let configPath = path.join(__dirname, "cfg", configFile.groups.config);
								if (fs.existsSync(configPath)) {
									let configContent = fs.readFileSync(configPath).toString();
									let extrasMatch = configContent.match(/^sv_guardian_extra_equipment_ct\s+(?<extras>["\w,]+).*$/im);
									if (extrasMatch) {
										let replacements = extrasMatch.groups.extras.replace(/"/g, "").split(",");
										let number = Number(loc.slice(-1));
										if (!isNaN(number) && replacements[number]) {
											putIn = replacements[number];
										}
									}
								}
							}
							break;
						}
						default: {
							if (quest.string_tokens[loc]) {
								putIn = Helper.GetTranslation(translationTokens, quest.string_tokens[loc]);
							}
							break;
						}
					}

					if (putIn !== undefined) {
						questDesc = questDesc.replace(match[0], putIn.toString());
						strInd += putIn.toString().length;
					} else {
						console.log(quest, match);
						strInd += match[0].length;
					}
				}

				let parent = $("#hierarchy > li").last().find("ul").first();
				parent.append(cheerio.parseHTML("<li><span class=\"caret questName\">" + questName + "</span></li>"));
				parent.find("li").last().append(cheerio.parseHTML("<ul class=\"nested\"></ul>"));

				let tree = parent.find("li > ul").last();
				tree.append(cheerio.parseHTML("<li><span class=\"questDescriptionRaw\">Description: <span class=\"questDescriptionRawText\">" + questDescRaw + "</li>"));
				tree.append(cheerio.parseHTML("<li><span class=\"questDescription\">Description: <span class=\"questDescriptionText\">" + questDesc + "</li>"));
				tree.append(cheerio.parseHTML("<li><span class=\"questMode\">Mode: <span class=\"questModeText\">" + questMode + "</li>"));
				tree.append(cheerio.parseHTML("<li><span class=\"questReward\">Reward: <span class=\"questRewardText\">" + questReward + "</li>"));

				if (questLocation) {
					tree.append(cheerio.parseHTML("<li><span class=\"questLocation\">Location: <span class=\"questLocationText\">" + questLocation + "</li>"));
				}

				// Now stringify our object and try to build a tree out of it
				tree.append(cheerio.parseHTML("<li><span class=\"caret questObject\">Raw Object</span></li>"));
				tree.find("li").last().append(cheerio.parseHTML("<ul class=\"nested\"></ul>"));

				let object = tree.find("li").last().find("ul").last();

				for (let key1 in quest) {
					if (typeof quest[key1] === "object") {
						// Do this again
						// Max 1 depth anyways so no recursive function
						object.append(cheerio.parseHTML("<li><span class=\"caret\">" + key1 + "</span></li>"));
						object.find("li").last().append(cheerio.parseHTML("<ul class=\"nested\"></ul>"));
						let depth1 = object.find("li").last().find("ul").last();

						for (let key2 in quest[key1]) {
							if (typeof quest[key1][key2] === "object") {
								// There should never be another object but just to be sure
								depth1.append(cheerio.parseHTML("<li><span>" + key2 + ": [Object: object]</span></li>"));
							} else {
								depth1.append(cheerio.parseHTML("<li><span>" + key2 + ": " + quest[key1][key2] + "</span></li>"));
							}
						}
					} else {
						object.append(cheerio.parseHTML("<li><span>" + key1 + ": " + quest[key1] + "</span></li>"));
					}
				}
			}
		}
	}

	let html = $("#hierarchy").parent().html();
	let additions = [
		"<html>",

		"	<head>",
		"		<style>",
		"			ul, #hierarchy {",
		"				list-style-type: none;",
		"			}",
		"			",
		"			#hierarchy {",
		"				margin: 0;",
		"				padding: 0;",
		"			}",
		"			",
		"			.caret {",
		"				cursor: pointer;",
		"				user-select: none;",
		"			}",
		"			",
		"			.caret::before {",
		"				content: \"\\25B6\";",
		"				color: black;",
		"				display: inline-block;",
		"				margin-right: 6px;",
		"			}",
		"			",
		"			.caret-down::before {",
		"				transform: rotate(90deg);",
		"			}",
		"			",
		"			.nested {",
		"				display: none;",
		"			}",
		"			",
		"			.active {",
		"				display: block;",
		"			}",
		"		</style>",

		"		<script>",
		"			document.addEventListener(\"DOMContentLoaded\", () => {",
		"				let toggler = document.getElementsByClassName(\"caret\");",
		"				for (let i = 0; i < toggler.length; i++) {",
		"					toggler[i].addEventListener(\"click\", function () {",
		"						this.parentElement.querySelector(\".nested\").classList.toggle(\"active\");",
		"						this.classList.toggle(\"caret-down\");",
		"					});",
		"				}",
		"			}, false);",
		"		</script>",
		"	</head>",

		"	<body>",
		html,
		"	</body>",

		"</html>"
	];
	fs.writeFileSync("index.html", additions.join("\n"));

	console.log("Done!");
})();
