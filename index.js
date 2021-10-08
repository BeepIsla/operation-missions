import * as fs from "fs/promises";
import got from "got";
import VDF from "vdf-parser";
import CommandLine from "./helpers/CommandLine.js";
import Cache from "./helpers/Cache.js";
import Translation from "./helpers/Translation.js";
import Card from "./components/Card.js";

// Easy to change for future operations
const OPERATION_INDEX = "10";
const OPERATION_START = 1632254400000;

let urls = {
	itemsGame: "https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/scripts/items/items_game.txt",
	translation: "https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/resource/" + (CommandLine.Get("--language") || "csgo_english.txt"),
	english: "https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/resource/csgo_english.txt",
	gamemodes: "https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/gamemodes.txt"
};

// Get all the required files
if (CommandLine.Includes("--local")) {
	await Promise.all(Object.keys(urls).map((key) => {
		let fileName = urls[key].split("/").pop();
		return Cache.GetFileLocal(key, fileName, VDF.parse, {
			arrayify: true,
			types: false,
			conditionals: []
		});
	}));
} else {
	await fs.rm("cfg", {
		force: true,
		recursive: true
	});
	await fs.mkdir("cfg");

	console.log("Fetching files...");
	await Promise.all(Object.keys(urls).map((key) => {
		return Cache.GetFile(urls[key], key, VDF.parse, {
			arrayify: true,
			types: false,
			conditionals: []
		});
	}));

	// Removed Guardian stuff here, maybe add it back later
}

console.log("Building...");

const itemsGame = Cache.GetFileNoFetch("itemsGame");
const translation = new Translation(Cache.GetFileNoFetch("translation"), Cache.GetFileNoFetch("english"));

const operation = itemsGame.items_game.seasonaloperations.find(o => o[OPERATION_INDEX])[OPERATION_INDEX];
const cards = operation.quest_mission_card.map((c, i) => new Card(translation, c, OPERATION_START + ((7 * 24 * 60 * 60 * 1000) * i), i + 1));

const HTML = [
	"<head>",
	"	<style>",
	"		ul, #hierarchy {",
	"			list-style-type: none;",
	"		}",
	"",
	"		#hierarchy {",
	"			margin: 0;",
	"			padding: 0;",
	"		}",
	"",
	"		.caret {",
	"			cursor: pointer;",
	"			user-select: none;",
	"		}",
	"",
	"		.caret::before {",
	"			content: \"\\25B6\";",
	"			color: black;",
	"			display: inline-block;",
	"			margin-right: 6px;",
	"		}",
	"",
	"		.caret-down::before {",
	"			transform: rotate(90deg);",
	"		}",
	"",
	"		.nested {",
	"			display: none;",
	"		}",
	"",
	"		.active {",
	"			display: block;",
	"		}",
	"",
	"		td {",
	"			text-align: center;",
	"		}",
	"",
	"		table {",
	"			border: 1px solid black;",
	"		}",
	"",
	"		tbody > tr:nth-child(even) {",
	"			background-color: #969696;",
	"		}",
	"	</style>",
	"",
	"	<script>",
	"		function formatTime(diff) {",
	"			let delta = Math.round(Math.abs(diff) / 1000);",
	"			let days = Math.floor(delta / (24 * 60 * 60));",
	"			delta -= days * (24 * 60 * 60);",
	"			let hours = Math.floor(delta / (60 * 60)) % 24;",
	"			delta -= hours * (60 * 60);",
	"			let minutes = Math.floor(delta / 60) % 60;",
	"			delta -= minutes * 60;",
	"			let seconds = delta % 60;",
	"			if (days >= 7) {",
	"				return days + \" day\" + (days === 1 ? \"\" : \"s\")",
	"			} else if (days > 0) {",
	"				return (days + \" day\" + (days === 1 ? \"\" : \"s\")) + \" \" + [",
	"					hours < 10 ? (\"0\" + hours) : hours,",
	"					minutes < 10 ? (\"0\" + minutes) : minutes,",
	"					(seconds < 10 ? (\"0\" + seconds) : seconds) + \" hour\" + (hours === 1 ? \"\" : \"s\")",
	"				].join(\":\");",
	"			} else if (hours > 0) {",
	"				return [",
	"					hours < 10 ? (\"0\" + hours) : hours,",
	"					minutes < 10 ? (\"0\" + minutes) : minutes,",
	"					(seconds < 10 ? (\"0\" + seconds) : seconds) + \" hour\" + (hours === 1 ? \"\" : \"s\")",
	"				].join(\":\");",
	"			} else if (minutes > 0) {",
	"				return [",
	"					minutes < 10 ? (\"0\" + minutes) : minutes,",
	"					(seconds < 10 ? (\"0\" + seconds) : seconds) + \" minute\" + (minutes === 1 ? \"\" : \"s\")",
	"				].join(\":\");",
	"			} else if (seconds > 0) {",
	"				return [",
	"					(seconds < 10 ? (\"0\" + seconds) : seconds) + \" second\" + (seconds === 1 ? \"\" : \"s\")",
	"				].join(\":\");",
	"			}",
	"		}",
	"",
	"		document.addEventListener(\"DOMContentLoaded\", () => {",
	"			// Carrot toggling",
	"			let toggler = document.getElementsByClassName(\"caret\");",
	"			for (let i = 0; i < toggler.length; i++) {",
	"				toggler[i].addEventListener(\"click\", function () {",
	"					this.parentElement.querySelector(\".nested\").classList.toggle(\"active\");",
	"					this.classList.toggle(\"caret-down\");",
	"				});",
	"			}",
	"",
	"			// Time display",
	"			setInterval(() => {",
	"				for (let el of document.querySelectorAll(\"i.week-time-tracker\")) {",
	"					let attrib = el.attributes.getNamedItem(\"data-time\");",
	"					let timestampUnlocked = parseInt(attrib.value);",
	"					if (Date.now() >= timestampUnlocked) {",
	"						el.remove();",
	"					}",
	"",
	"					el.innerText = \"in \" + formatTime(timestampUnlocked - Date.now());",
	"				}",
	"			}, 500);",
	"		});",
	"	</script>",
	"</head>",
	"",
	"<body>",
	"	<ul id=\"hierarchy\">"
];
for (let card of cards) {
	HTML.push(...[
		"<li>",
		"	<span class=\"caret\">",
		`		${card.GetName()}`,
		"	</span>",
		"",
		"	<ul class=\"nested\">",
		card.ToTable(),
		"	</ul>",
		"</li>"
	].map(l => `\t\t${l}`));
}

HTML.push(...[
	"	</ul>",
	"</body>"
]);

await fs.rm("out", {
	force: true,
	recursive: true
});
await fs.mkdir("out");
await fs.writeFile("out/index.html", HTML.join("\n"));
