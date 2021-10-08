import * as fs from "fs/promises";
import VDF from "vdf-parser";
import CommandLine from "./helpers/CommandLine.js";
import Cache from "./helpers/Cache.js";
import Translation from "./helpers/Translation.js";
import Card from "./components/Card.js";

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

// Get the current operation
let operationIndex = 0;
for (let ops of itemsGame.items_game.seasonaloperations) {
	operationIndex = Math.max(Object.keys(ops).reduce((prev, cur) => {
		cur = parseInt(cur);
		return Math.max(prev, cur);
	}, 0), operationIndex);
}
let operationStart = itemsGame.items_game.quest_schedule.start * 1000;
let operationName = `Operation ${translation.Get(`op${operationIndex + 1}_name`)}`;

const operation = itemsGame.items_game.seasonaloperations.find(o => o[operationIndex])[operationIndex];
const cards = operation.quest_mission_card.map((c, i) => new Card(translation, c, operationStart + ((7 * 24 * 60 * 60 * 1000) * i), i + 1));
const xpRewardsList = operation.xp_reward.find(x => /^(\d+(,|$))+$/.test(x)).split(",");

const HTML = [
	"<head>",
	`	<title>CSGO ${operationName} Missions</title>`,
	"	<link rel=\"icon\" type=\"image/png\" href=\"favicon.png\" />",
	"	<meta content=\"CS:GO Mission Tracker | by BeepIsla\" property=\"og:title\" />",
	`	<meta content="Check out the new ${operationName} missions before everyone else thanks to this handy tracker!" property="og:description" />`,
	"	<meta content=\"https://beepisla.github.io/operation-missions/logo.png\" property=\"og:image\" />",
	"	<meta content=\"#E0B04C\" data-react-helmet=\"true\" name=\"theme-color\" />",
	"	<meta name=\"twitter:card\" content=\"summary_large_image\">",
	"",
	"	<style>",
	"		@import url(\"https://fonts.googleapis.com/css2?family=Noto+Sans+Display:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap\");",
	"",
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
	"		.caret-red::before {",
	"			color: #FDAAAA !important;",
	"		}",
	"",
	"		.caret::before {",
	"			content: \"\\25B6\";",
	"			color: #C8821A;",
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
	"			border: 1px solid rgb(100, 100, 100);",
	"			width: 100%;",
	"		}",
	"",
	"		tbody > tr:nth-child(even) {",
	"			background-color: #1B1B3A;",
	"		}",
	"",
	"		th {",
	"			background-color: #1B1B3A;",
	"			color: #C8821A;",
	"		}",
	"",
	"		body {",
	"			background-color: #0B0E13;",
	"			color: #FFFFFF;",
	"			font-family: \"Noto Sans Display\";",
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
	`	<h1 style="color:#C8821A">All available CSGO ${operationName} missions</h1>`,
	`	<span>Created by <a style="color:#C8821A; font-size: 115%;" target="_blank" href="https://github.com/BeepIsla/operation-missions">BeepIsla</a>. Gain a total of ${xpRewardsList.length} XP boosts by playing them!</span>`,
	"	<br><br>",
	"",
	"	<ul id=\"hierarchy\">"
];
for (let card of cards) {
	HTML.push(...[
		"<li>",
		`	<span class="caret${card.locked ? " caret-red" : ""}">`,
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
await fs.copyFile("logo.png", "out/logo.png");
await fs.copyFile("favicon.png", "out/favicon.png");
