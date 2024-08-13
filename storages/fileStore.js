const fs = require("fs").promises;
const path = require("path");

class FileStore {
  constructor(options = {}) {
    this.path = options.path || path.join(process.cwd(), "sessions");
    this.ttl = options.ttl || 86400;
    this.ensureDirectory();
  }

  async ensureDirectory() {
    try {
      await fs.access(this.path);
    } catch (error) {
      if (error.code === "ENOENT") {
        try {
          await fs.mkdir(this.path, { recursive: true });
        } catch (mkdirError) {
          console.error(`Errore nella creazione della directory delle sessioni: ${mkdirError}`);
          throw mkdirError;
        }
      } else {
        console.error(`Errore nell'accesso alla directory delle sessioni: ${error}`);
        throw error;
      }
    }
  }

  get(sid, callback) {
    const filePath = this._getFilePath(sid);
    fs.readFile(filePath, "utf8")
        .then((data) => {
            try {
                const sessionData = JSON.parse(data);
                if (sessionData.expires && new Date(sessionData.expires) <= new Date()) {
                    this.destroy(sid, () => callback());
                } else {
                    if (sessionData.session.cookie && sessionData.session.cookie.expires) {
                        sessionData.session.cookie.expires = new Date(sessionData.session.cookie.expires);
                    }
                    callback(null, sessionData.session);
                }
            } catch (err) {
                callback(new Error("Failed to parse session data"));
            }
        })
        .catch((error) => {
            if (error.code === "ENOENT") {
                callback();
            } else {
                callback(new Error("Failed to read session data"));
            }
        });
  }

  set(sid, session, callback) {
    const filePath = this._getFilePath(sid);
    const sessionData = {
        sid: sid,
        session: {
            ...session,
            cookie: session.cookie ? {
                ...session.cookie,
                expires: session.cookie.expires ? session.cookie.expires.toISOString() : null
            } : null
        },
        expires: new Date(Date.now() + this.ttl * 1000).toISOString()
    };
    fs.writeFile(filePath, JSON.stringify(sessionData), "utf8")
        .then(() => callback())
        .catch((err) => callback(new Error("Failed to write session data")));
  }

  destroy(sid, callback) {
    const filePath = this._getFilePath(sid);
    fs.unlink(filePath)
      .then(() => callback())
      .catch((error) => {
        if (error.code === "ENOENT") {
          callback();
        } else {
          callback(new Error("Failed to destroy session"));
        }
      });
  }

  all(callback) {
    fs.readdir(this.path)
      .then((files) => {
        Promise.all(
          files.map((file) => {
            const sid = path.basename(file, ".json");
            return fs
              .readFile(path.join(this.path, file), "utf8")
              .then((data) => {
                const sessionData = JSON.parse(data);
                return { sid, session: sessionData.session };
              });
          })
        )
          .then((sessions) => callback(null, sessions))
          .catch(callback);
      })
      .catch(callback);
  }

  length(callback) {
    fs.readdir(this.path)
      .then((files) => callback(null, files.length))
      .catch(callback);
  }

  clear(callback) {
    fs.readdir(this.path)
      .then((files) =>
        Promise.all(files.map((file) => fs.unlink(path.join(this.path, file))))
      )
      .then(() => callback())
      .catch(callback);
  }

  touch(sid, session, callback) {
    this.get(sid, (err, existingSession) => {
      if (err) return callback(err);
      if (!existingSession) return callback();
      this.set(sid, session, callback);
    });
  }

  _getFilePath(sid) {
    return path.join(this.path, `${sid}.json`);
  }
}

module.exports = FileStore;