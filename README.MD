# Session-Store-Js

This package provides a robust and flexible session management solution for Express.js applications. It supports two types of session storage: MemoryStore for in-memory storage and FileStore for file system persistence.

  <div align="center">
  <p>
    <a href="https://github.com/matteotorna/session-store-js/releases/latest">
  <img src="https://img.shields.io/github/v/release/matteotorna/session-store-js?style=for-the-badge" alt="GitHub release (latest SemVer)" /></a>
    <a href="https://github.com/matteotorna/session-store-js/releases/latest">
    <img src="https://img.shields.io/github/release-date/matteotorna/session-store-js?label=latest%20release&style=for-the-badge" alt="Latest release" /></a>
   <a href="https://www.npmjs.com/package/session-store-js"><img src="https://img.shields.io/npm/v/session-store-js.svg?logo=npm&style=for-the-badge" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/session-store-js"><img src="https://img.shields.io/npm/dt/session-store-js.svg?style=for-the-badge" alt="NPM downloads" /></a>
  </p>
</div>


## Installation

To install PryxAPI, run the following command in your project directory:

```bash
npm install session-store-js
```

# Key Features

- `Dual Storage Support`: Choose between MemoryStore for quick, non-persistent sessions, or FileStore for persistent sessions.
- `Express.js Integration`: Seamlessly integrates as Express middleware.
- `Asynchronous API`: All session operations are asynchronous for improved performance.
- `Automatic Cookie Management`: Handles session cookies with security in mind.
- `Comprehensive Session Operations`: Includes methods for getting, setting, destroying, and touching sessions.
- `Session Overview`: Provides methods to retrieve all active sessions and clear them globally.
- `Advanced Store Management`: Includes methods to control cleanup and maintenance processes for both MemoryStore and FileStore.

## Usage

To use the SessionManager, first import it and create an instance::

```javascript
const SessionManager = require('session-store-js');

const sessionManager = new SessionManager({
    storeType: 'memory', // or 'file'
    storeOptions: {}, // options specific to the store type
    secret: 'your-secret-key',
    cookieName: 'custom.sid',
    maxAge: 3600000 // 1 hour
});
  ```

## Configuration Options

- `storeType`: Choose 'memory' or 'file'.
- `storeOptions`: Configuration for the chosen store type.

   - MemoryStore options:

        - `maxAge`: Maximum session age (milliseconds).
        - `cleanupInterval`: Interval for clearing expired sessions (milliseconds).
        - `indexInterval`: Interval for rebuilding the expiration index (milliseconds).

    - FileStore options:

        - `path`: Directory for storing session files.
        - `ttl`: Session time-to-live (seconds).

- `secret`: Secret key for signing cookies.
- `cookieName`: Custom name for the session cookie.
- `maxAge`: Session lifetime (milliseconds).

## Express Middleware

Apply the session middleware to your Express app:

```javascript
app.use(sessionManager.middleware());
```

## Common Session Operations

1. Get a Session Value

```javascript
const value = await sessionManager.get(req, 'key');
```

2. Set a Session Value

```javascript
await sessionManager.set(req, 'key', 'value');
```

3. Destroy a Session

```javascript
await sessionManager.destroy(req);
```

4. Update Session Expiration (Touch)

```javascript
await sessionManager.touch(req);
```

5. Retrieve All Sessions

```javascript
const sessions = await sessionManager.getAllSessions();
```

6. Clear All Sessions

```javascript
await sessionManager.clearAllSessions();
```

## MemoryStore Specific Operations

1. Start Cleanup Process

```javascript
sessionManager.store.startCleanup();
```

2. Stop Cleanup Process

```javascript
sessionManager.store.stopCleanup();
```

3. Start Index Rebuild Process

```javascript
sessionManager.store.startIndexRebuild();
```

4. Stop Index Rebuild Process

```javascript
sessionManager.store.stopIndexRebuild();
```

## FileStore Specific Operations

1. Ensure Directory Exists

```javascript
const filePath = sessionManager.store._getFilePath(sessionId);
```

2. Get File Path for Session

```javascript
sessionManager.store.stopCleanup();
```

## Examples
### MemoryStore Example

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const { SessionManager } = require('session-store-js');

const app = express();
app.use(cookieParser());

const sessionManager = new SessionManager({
    storeType: 'memory',
    storeOptions: {
        cleanupInterval: 300000, // 5 minutes
        indexInterval: 60000 // 1 minute
    },
    secret: 'your-secret-key',
    cookieName: 'my.session.id',
    maxAge: 3600000 // 1 hour
});

app.use(sessionManager.middleware());

app.get('/', async (req, res) => {
    const visitCount = (await sessionManager.get(req, 'visits') || 0) + 1;
    await sessionManager.set(req, 'visits', visitCount);
    res.send(`Welcome! You've visited this page ${visitCount} times.`);
});

app.get('/touch', async (req, res) => {
    await sessionManager.touch(req);
    res.send('Session touched');
});

app.get('/logout', async (req, res) => {
    await sessionManager.destroy(req);
    res.send('Logged out successfully');
});

app.get('/all-sessions', async (req, res) => {
    const sessions = await sessionManager.getAllSessions();
    res.json(sessions);
});

app.get('/clear-all', async (req, res) => {
    await sessionManager.clearAllSessions();
    res.send('All sessions cleared');
});

app.get('/start-cleanup', (req, res) => {
    sessionManager.store.startCleanup();
    res.send('Cleanup started');
});

app.get('/stop-cleanup', (req, res) => {
    sessionManager.store.stopCleanup();
    res.send('Cleanup stopped');
});

app.get('/start-index-rebuild', (req, res) => {
    sessionManager.store.startIndexRebuild();
    res.send('Index rebuild started');
});

app.get('/stop-index-rebuild', (req, res) => {
    sessionManager.store.stopIndexRebuild();
    res.send('Index rebuild stopped');
});

app.listen(3000, () => console.log('MemoryStore server running on port 3000'));
```

## FileStore Example

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const { SessionManager } = require('session-store-js');

const app = express();
app.use(cookieParser());

const sessionManager = new SessionManager({
    storeType: 'file',
    storeOptions: {
        path: './sessions',
        ttl: 86400, // 1 day in seconds
    },
    secret: 'your-file-secret-key',
    cookieName: 'my.file.session.id',
    maxAge: 86400000 // 1 day in milliseconds
});

app.use(sessionManager.middleware());

app.get('/', async (req, res) => {
    const visitCount = (await sessionManager.get(req, 'visits') || 0) + 1;
    await sessionManager.set(req, 'visits', visitCount);
    res.send(`Welcome! You've visited this page ${visitCount} times.`);
});

app.get('/touch', async (req, res) => {
    await sessionManager.touch(req);
    res.send('Session touched');
});

app.get('/logout', async (req, res) => {
    await sessionManager.destroy(req);
    res.send('Logged out successfully');
});

app.get('/all-sessions', async (req, res) => {
    const sessions = await sessionManager.getAllSessions();
    res.json(sessions);
});

app.get('/clear-all', async (req, res) => {
    await sessionManager.clearAllSessions();
    res.send('All sessions cleared');
});

app.get('/ensure-directory', async (req, res) => {
    await sessionManager.store.ensureDirectory();
    res.send('Session directory ensured');
});

app.get('/file-path', (req, res) => {
    if (req.sessionID) {
        const filePath = sessionManager.store._getFilePath(req.sessionID);
        res.send(`Session file path: ${filePath}`);
    } else {
        res.status(400).send('No active session');
    }
});

app.listen(3001, () => console.log('FileStore server running on port 3001'));
```

## Explanation of Examples
### MemoryStore Example

- Initializes SessionManager with MemoryStore and specific options.
- Implements a visit counter using session storage.
- Includes routes to start and stop the cleanup process.

### FileStore Example

- Configures SessionManager with FileStore and appropriate options.
- Implements the same visit counter functionality.
- Includes a route to ensure the session directory exists.

Both examples demonstrate the consistent API across different storage types, while also showcasing store-specific operations.

## Best Practices

1. Use a strong, unique secret for production environments.
2. Adjust maxAge and cleanup intervals based on your application's needs and traffic patterns.
3. For FileStore, ensure the specified path is secure and has appropriate permissions.
4. Regularly monitor and manage session cleanup processes to optimize performance.

## Security Considerations

- The middleware automatically sets secure and httpOnly flags on cookies in production mode.
- Regularly rotate the secret key to enhance security.
- Be cautious when using getAllSessions() in production, as it can be resource-intensive for large numbers of sessions.
- Ensure that routes controlling store-specific operations are properly secured in production environments.
- For FileStore, implement proper file system permissions and consider encryption for sensitive session data.

This comprehensive guide covers the usage of your SessionManager package with both MemoryStore and FileStore, including common operations and store-specific functionalities. It provides developers with the necessary information to effectively implement and manage sessions in their Express.js applications using your package.
