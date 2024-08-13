class MemoryStore {
  constructor(options = {}) {
    this.sessions = new Map();
    this.expirationIndex = new Map();
    this.maxAge = options.maxAge || 86400000; // 1 day default
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutes default
    this.indexInterval = options.indexInterval || 60000; // 1 minute default

    this.cleanupIntervalId = null;
    this.indexRebuildIntervalId = null;
  }

  set(sid, session, callback) {
    const expires = Date.now() + this.maxAge;
    this.sessions.set(sid, { data: {...session}, expires });
    this.expirationIndex.set(expires, sid);
    process.nextTick(() => callback(null));
  }

  get(sid, callback) {
    const sessionData = this.sessions.get(sid);
    if (!sessionData || Date.now() > sessionData.expires) {
      if (sessionData) this.destroy(sid, () => {});
      return process.nextTick(() => callback());
    }
    process.nextTick(() => callback(null, sessionData.data));
  }

  destroy(sid, callback) {
    const sessionData = this.sessions.get(sid);
    if (sessionData) {
      this.sessions.delete(sid);
      this.expirationIndex.delete(sessionData.expires);
    }
    callback();
  }

  all(callback) {
    const sessions = Array.from(this.sessions.entries())
      .filter(([, sessionData]) => Date.now() < sessionData.expires)
      .map(([sid, sessionData]) => ({ sid, session: sessionData.data }));
    callback(null, sessions);
  }

  length(callback) {
    callback(null, this.sessions.size);
  }

  clear(callback) {
    this.sessions.clear();
    this.expirationIndex.clear();
    callback();
  }

  touch(sid, session, callback) {
    const sessionData = this.sessions.get(sid);
    if (sessionData) {
      const oldExpires = sessionData.expires;
      const newExpires = Date.now() + this.maxAge;
      sessionData.expires = newExpires;
      sessionData.data = session;
      this.sessions.set(sid, sessionData);
      this.expirationIndex.delete(oldExpires);
      this.expirationIndex.set(newExpires, sid);
    }
    callback();
  }

  cleanupSessions() {
    const now = Date.now();
    for (let [expires, sid] of this.expirationIndex) {
      if (expires <= now) {
        this.destroy(sid, () => {});
        this.expirationIndex.delete(expires);
      } else {
        break;
      }
    }
  }

  rebuildIndex() {
    const newIndex = new Map();
    for (let [sid, sessionData] of this.sessions) {
      if (sessionData.expires > Date.now()) {
        newIndex.set(sessionData.expires, sid);
      } else {
        this.sessions.delete(sid);
      }
    }
    this.expirationIndex = newIndex;
  }

  startCleanup() {
    if (this.cleanupIntervalId === null) {
      this.cleanupIntervalId = setInterval(() => this.cleanupSessions(), this.cleanupInterval);
    }
  }

  stopCleanup() {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  startIndexRebuild() {
    if (this.indexRebuildIntervalId === null) {
      this.indexRebuildIntervalId = setInterval(() => this.rebuildIndex(), this.indexInterval);
    }
  }

  stopIndexRebuild() {
    if (this.indexRebuildIntervalId !== null) {
      clearInterval(this.indexRebuildIntervalId);
      this.indexRebuildIntervalId = null;
    }
  }
}

module.exports = MemoryStore;