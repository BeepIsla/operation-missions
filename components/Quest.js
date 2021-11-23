import Cache from "../helpers/Cache.js";
import QuestType from "./QuestType.js";
import SubQuest from "./SubQuest.js";

export default class Quest {
	constructor(loc, questID) {
		this.loc = loc;

		let itemsGame = Cache.GetFileNoFetch("itemsGame");
		this.quest = itemsGame.items_game.quest_definitions.find(q => q[questID])[questID];
		this.subQuests = [];

		if (this.quest.expression.startsWith("QQ:>")) {
			this.type = QuestType.SpecificOrder;

			let parts = this.quest.expression.split(">").slice(1);
			for (let part of parts) {
				this.subQuests.push(new SubQuest(loc, part));
			}
		} else if (this.quest.expression.startsWith("QQ:|")) {
			let parts = this.quest.expression.split("|").slice(1);
			for (let part of parts) {
				this.subQuests.push(new SubQuest(loc, part));
			}

			if (parts.length === 2) {
				this.type = QuestType.EitherOrMission;
			} else {
				this.type = QuestType.AnyOrderMission;
			}
		} else {
			this.type = QuestType.SingleNormalMission;
		}
	}

	GetName() {
		let name = this.loc.Get(this.quest.loc_name);
		let match = name.match(/<i>(?<name>.*)<\/i>/i);
		if (match) {
			return match.groups.name.trim();
		}

		let parts = name.split("-");
		if (parts.length === 3) {
			return parts[1].trim();
		}
		return parts.pop().trim();
	}

	IsSkirmish() {
		let gameModes = Cache.GetFileNoFetch("gamemodes")["GameModes.txt"];
		if (this.quest.mapgroup) {
			let mapgroup = gameModes.mapgroups[this.quest.mapgroup];
			if (!mapgroup) {
				throw new Error("Failed to get mapgroup");
			}

			return mapgroup.icon_image_path === "map_icons/mapgroup_icon_skirmish";
		}

		// Singular maps are never Skirmish
		return false;
	}

	GetMode() {
		if (this.IsSkirmish()) {
			return this.loc.Get("SFUI_GameModeSkirmish");
		}

		let gameModes = Cache.GetFileNoFetch("gamemodes")["GameModes.txt"];
		for (let type in gameModes.gameTypes) {
			if (gameModes.gameTypes[type].gameModes[this.quest.gamemode]) {
				return this.loc.Get(gameModes.gameTypes[type].gameModes[this.quest.gamemode].nameID);
			}
		}

		throw new Error("Failed to get mode");
	}

	GetMap() {
		let gameModes = Cache.GetFileNoFetch("gamemodes")["GameModes.txt"];
		if (this.quest.mapgroup) {
			let mapgroup = gameModes.mapgroups[this.quest.mapgroup];
			if (!mapgroup) {
				throw new Error("Failed to get mapgroup");
			}

			return this.loc.Get(mapgroup.nameID);
		}

		if (this.quest.map) {
			let map = gameModes.maps[this.quest.map];
			if (!map) {
				throw new Error("Failed to get map");
			}

			return this.loc.Get(map.nameID);
		}

		return "";
	}

	GetDescription() {
		if (this.type === QuestType.EitherOrMission) {
			// Put these as description
			return this.subQuests.map(q => q.GetGoal()).join(" or ");
		} else if (this.quest.loc_description) {
			let desc = this.loc.Get(this.quest.loc_description);
			let parts = desc.split(" in ");
			if (parts.length > 1) {
				parts.pop();
			}
			return parts.join(" in ").trim();
		} else {
			return "";
		}
	}

	GetRewardText() {
		if (this.quest.points.includes(",")) {
			// You get "operational_points" per this many points reached
			let parts = this.quest.points.split(",").sort((a, b) => {
				return parseInt(a) - parseInt(b);
			});
			return `${this.quest.operational_points}x <span style="color: #C8821A;">★</span> for ${parts.reduce((prev, cur, index) => {
				if (index === 0) {
					return cur;
				} else if ((index + 1) >= parts.length) {
					if (index === 1) {
						// There are only two options, so don't include a comma
						return prev + " and " + cur + " objectives completed";
					} else {
						return prev + ", and " + cur + " objectives completed";
					}
				} else {
					return prev + ", " + cur;
				}
			}, "")}`;
		} else {
			// You get "operational_points" once all points have been reached
			// Eg: 50 kills (Points), 1 match win (Points)
			return `<span style="color: #C8821A;">${new Array(parseInt(this.quest.operational_points)).fill("★").join(" ")}</span>`;
		}
	}

	GetDetails() {
		if (this.type === QuestType.EitherOrMission || this.type === QuestType.SingleNormalMission) {
			// These have no details
			return "";
		}

		let joinString = {
			[QuestType.AnyOrderMission]: ", ",
			[QuestType.SpecificOrder]: " -> "
		};
		let subMissionGoals = this.subQuests.map((quest) => {
			return quest.GetGoal();
		});

		// Try and filter out all the prefixes such as "Get a kill from" or "Apply graffiti at"
		// Maybe try and detect this automatically?
		let prefixes = [
			"Get a kill from",
			"Apply graffiti (at|on|in) (the|)",
			"Get a streak of",
			"Get a kill at"
		];
		for (let prefix of prefixes) {
			for (let i = 0; i < subMissionGoals.length; i++) {
				subMissionGoals[i] = subMissionGoals[i].replace(new RegExp(`^${prefix}`, "i"), "").trim();
				subMissionGoals[i] = `${subMissionGoals[i][0].toUpperCase()}${subMissionGoals[i].slice(1)}`;
			}
		}
		return subMissionGoals.join(joinString[this.type]);
	}

	ToColumn() {
		return [
			"<tr>",
			`	<td>${this.GetName()}</td>`,
			`	<td>${this.GetMode()}${this.GetMap() ? `: ${this.GetMap()}` : ""}</td>`,
			`	<td>${this.GetDescription()}</td>`,
			`	<td>${this.GetRewardText()}</td>`,
			`	<td>${this.GetDetails()}</td>`,
			"</tr>"
		].map(l => "\t\t" + l).join("\n");
	}
}
