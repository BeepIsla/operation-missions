import Quest from "./Quest.js";

export default class Card {
	constructor(loc, card, dateStartTimestamp, weekIndex) {
		this.loc = loc;
		this.weekIndex = weekIndex;

		this.id = parseInt(card.id);
		this.name = card.name;
		this.start = new Date(dateStartTimestamp);
		this.quests = [];
		this.locked = card.quests === "locked";
		if (!this.locked) {
			let parts = card.quests.split(",");
			for (let part of parts) {
				if (part.includes("-")) {
					let range = part.split("-");
					let min = Number(range[0]);
					let max = Number(range[1]);
					for (let i = min; i <= max; i++) {
						this.quests.push(new Quest(loc, i.toString()));
					}
				} else {
					this.quests.push(new Quest(loc, part.toString()));
				}
			}
		}
	}

	GetName() {
		return `Week ${this.weekIndex}: ${this.loc.Get(this.name)} <i class="week-time-tracker" data-time="${this.start.getTime()}"></i>`;
	}

	ToTable() {
		if (this.locked) {
			return [
				"<table style=\"width: 100%;\">",
				"	<colgroup>",
				"		<col span=\"1\" style=\"width: 15%;\">",
				"		<col span=\"1\" style=\"width: 10%;\">",
				"		<col span=\"1\" style=\"width: 30%;\">",
				"		<col span=\"1\" style=\"width: 10%;\">",
				"		<col span=\"1\" style=\"width: 35%;\">",
				"	</colgroup>",
				"",
				"	<thead>",
				"		<tr>",
				"			<th>Name</th>",
				"			<th>Mode</th>",
				"			<th>Description</th>",
				"			<th>Reward</th>",
				"			<th>Details</th>",
				"		</tr>",
				"	</thead>",
				"",
				"	<tbody>",
				"		<td colspan=\"5\">Quests Unavailable</td>",
				"	</tbody>",
				"</table>"
			].join("\n");
		} else {
			return [
				"<table>",
				"	<colgroup>",
				"		<col span=\"1\" style=\"width: 15%;\">",
				"		<col span=\"1\" style=\"width: 10%;\">",
				"		<col span=\"1\" style=\"width: 30%;\">",
				"		<col span=\"1\" style=\"width: 10%;\">",
				"		<col span=\"1\" style=\"width: 35%;\">",
				"	</colgroup>",
				"",
				"	<thead>",
				"		<tr>",
				"			<th>Name</th>",
				"			<th>Mode</th>",
				"			<th>Description</th>",
				"			<th>Reward</th>",
				"			<th>Details</th>",
				"		</tr>",
				"	</thead>",
				"",
				"	<tbody>",
				this.quests.map(q => q.ToColumn()).join("\n"),
				"	</tbody>",
				"</table>"
			].join("\n");
		}
	}
}
