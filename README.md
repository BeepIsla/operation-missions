# Operation Missions

This is a parser for the upcoming operation missions which are yet to be revealed but are available in the game files for Operation Riptide. Every time a new CSGO update is released [a workflow](https://github.com/BeepIsla/operation-missions/actions) will run automatically and the website linked below will update with the latest data.

**Available at [beepisla.github.io/operation-missions](https://beepisla.github.io/operation-missions)**

# Build

To build the `index.html` yourself simply open a command prompt and run `npm ci`, once finished run `node index.js`.
Make sure you don't run an ancient [NodeJS](https://nodejs.org/) version and upgrade regularly. Last tested using v18.7.0.

## Optional command line arguments

- `--language <language>` Force parser to translate using this language file
  - Example: `--language csgo_danish.txt`
  - Defaults to `csgo_english.txt`
  - Note: It is not guaranteed that your translation file will include all strings, you may have to wait for [Steam Translators](https://translation.steampowered.com/) to catch up.
  - Note: Non-English languages won't properly work because some text in this program is hardcoded for english. You would have to go through the code and modify it.
- `--local` Skip downloading of `items_game.txt`, `gamemodes.txt` and translation files and use local files instead
  - Parser will look for the listed files above in a folder called `local`
  - Note: Regardless of language defined there should always be a fallback `csgo_english.txt` available
