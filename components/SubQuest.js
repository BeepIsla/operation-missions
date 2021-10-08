import Cache from "../helpers/Cache.js";
import QuestType from "./QuestType.js";

export default class SubQuest {
	constructor(loc, questID) {
		this.loc = loc;

		let itemsGame = Cache.GetFileNoFetch("itemsGame");
		this.quest = itemsGame.items_game.quest_definitions.find(q => q[questID])[questID];
		this.subQuests = [];
		this.type = QuestType.SubMission;
	}

	GetGoal() {
		return this.loc.Get(this.quest.loc_description, {
			points: this.quest.points
		});
	}
}
