const fs = require("fs");
const path = require("path");
const Helper = require("./Helper.js");

module.exports = class Download {
  static Delete() {
    return new Promise((resolve, reject) => {
      let dir = path.join(__dirname, "..", "cfg");
      fs.readdir(dir, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        for (let file of files) {
          let filePath = path.join(dir, file);
          fs.unlinkSync(filePath);
        }

        resolve();
      });
    });
  }

  static Get() {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(path.join(__dirname, "..", "cfg"))) {
        fs.mkdirSync(path.join(__dirname, "..", "cfg"));
      }

      Helper.GetURL({
        uri:
          "https://api.github.com/repos/SteamDatabase/GameTracking-CSGO/contents/csgo/maps/cfg",
        headers: {
          "User-Agent": "CSGO Operation Missions - github.com/BeepIsla"
        }
      })
        .then(async (body) => {
          try {
            let json = JSON.parse(body);
            for (let file of json) {
              if (file.type !== "file") {
                return;
              }

              let content = await Helper.GetURL(file.download_url).catch(
                (err) => {
                  reject(err);
                }
              );
              if (!content) {
                return;
              }

              fs.writeFileSync(
                path.join(__dirname, "..", "cfg", file.name),
                content
              );
            }

            resolve();
          } catch (err) {
            reject(err);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
};
