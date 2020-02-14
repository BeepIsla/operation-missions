# Operation Missions

This is a parser for the upcoming operation missions which are yet to be revealed but are available in the game files.

**Available at [beepisla.github.io/operation-missions](https://beepisla.github.io/operation-missions)**

# Build

To build the `index.html` yourself simply open a command prompt and run `npm install`, once finished run `node index.js`.
Make sure you don't run an ancient [NodeJS](https://nodejs.org/) version and upgrade regularly.

## Optional command line arguments

- `--language <language>` Force parser to translate using this language file
  - Example: `--language csgo_danish.txt`
  - Defaults to `csgo_english.txt`
  - Note: It is not guaranteed that your translation file will include all strings, you may have to wait for [Steam Translators](https://translation.steampowered.com/) to catch up.
- `--local` Skip downloading of `items_game.txt`, `gamemodes.txt` and translation files and use local files instead
  - Parser will look for the listed files above in a folder called `local`
  - Parser will look for all config files (From `csgo/maps/cfg`) in a folder called `cfg`
  - Note: Regardless of language defined there should always be a fallback `csgo_english.txt` available

# Credits

- [w3schools.com](https://www.w3schools.com/) for [How To Create a Tree View](https://www.w3schools.com/howto/howto_js_treeview.asp) - [index.js L306](index.js#L306)
