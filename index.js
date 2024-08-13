const crypto = require('crypto');
const FileStore = require('./storages/fileStore');
const MemoryStore = require('./storages/memoryStore');

class SessionManager {
    constructor(options = {}) {
        this.storeType = options.storeType || 'memory';
        this.storeOptions = options.storeOptions || {};
        this.store = this.initializeStore();

        this.options = {
            secret: options.secret || crypto.randomBytes(32).toString('hex'),
            cookieName: options.cookieName || 'custom.sid',
            maxAge: options.maxAge || 86400000, // 1 day default
        };
    }

    initializeStore() {
        switch (this.storeType) {
            case 'file':
                return new FileStore(this.storeOptions);
            case 'memory':
                return new MemoryStore(this.storeOptions);
            default:
                throw new Error(`Unsupported store type: ${this.storeType}`);
        }
    }

    middleware() {
        return (req, res, next) => {
            const sessionId = req.cookies[this.options.cookieName] || this.generateSessionId();
            req.sessionID = sessionId;  
          
            this.store.get(sessionId, (err, session) => {
                if (err) return next(err);
        
                if (!session) {
                    session = {};
                    this.store.set(sessionId, session, (err) => {
                        if (err) return next(err);
                        this.setSessionCookie(res, sessionId, session);
                        req.session = this.createSessionWrapper(sessionId, session);
                        next();
                    });
                } else {
                    this.setSessionCookie(res, sessionId, session);
                    req.session = this.createSessionWrapper(sessionId, session);
                    next();
                }
            });
        };
    }

    createSessionWrapper(sessionId, session) {
        if (!session.cookie) {
            session.cookie = {
                originalMaxAge: this.options.maxAge,
                expires: new Date(Date.now() + this.options.maxAge),
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                path: '/',
                sameSite: 'strict'
            };
        }
        return {
            ...session,
            save: (callback) => {
                this.store.set(sessionId, session, callback);
            },
            touch: () => {
                session.cookie.expires = new Date(Date.now() + this.options.maxAge);
                this.store.touch(sessionId, session, () => {});
            },
            destroy: (callback) => {
                this.store.destroy(sessionId, callback);
            }
        };
    }

    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    setSessionCookie(res, sessionId, session) {
        const expires = new Date(Date.now() + this.options.maxAge);
        const cookieOptions = {
            expires: expires,
            maxAge: this.options.maxAge,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        };
        res.cookie(this.options.cookieName, sessionId, cookieOptions);
        session.cookie = {
            originalMaxAge: this.options.maxAge,
            expires: expires,
            secure: cookieOptions.secure,
            httpOnly: cookieOptions.httpOnly,
            path: '/',
            sameSite: cookieOptions.sameSite
        };
    }

    async set(req, key, value) {
        if (!req.session) throw new Error('Session not initialized');
        if (!req.sessionID) throw new Error('SessionID not set');
        req.session[key] = value;
        return new Promise((resolve, reject) => {
            this.store.set(req.sessionID, req.session, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
    
    async get(req, key) {
        if (!req.session) throw new Error('Session not initialized');
        return req.session[key];
    }

    async destroy(req) {
        if (!req.session) throw new Error('Session not initialized');
        return new Promise((resolve, reject) => {
            req.session.destroy((err) => err ? reject(err) : resolve());
        });
    }

    async getAllSessions() {
        return new Promise((resolve, reject) => {
            this.store.all((err, sessions) => err ? reject(err) : resolve(sessions));
        });
    }

    async clearAllSessions() {
        return new Promise((resolve, reject) => {
            this.store.clear((err) => err ? reject(err) : resolve());
        });
    }

    async touch(req) {
        if (!req.session) throw new Error('Session not initialized');
        return new Promise((resolve, reject) => {
            req.session.touch();
            req.session.save((err) => err ? reject(err) : resolve());
        });
    }
}

module.exports = SessionManager;