const axios = require("axios").default;

// Full RPC Documentation at:
// https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md

class TransmissionRPCClient {
  constructor(url, user, password) {
    this.url = new URL(url).toString();
    this.sessionId = null;
    this.auth = Buffer.from(`${user}:${password}`).toString("base64");
  }

  // status 409 = invalid\missing session id required for all requests
  // rpc server responds with id when none sent with request
  // session id saved for all future requests during session and
  // request is sent again
  // **** Auth encryption is weak and without https should not be used on
  // public networks, see for details :
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#security_of_basic_authentication
  http(method, keys) {
    return new Promise(async (resolve, reject) => {
      while (true) {
        try {
          const request = {
            url: this.url,
            method: "post",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "x-transmission-session-id": this.sessionId,
              Authorization: `Basic ${this.auth}`,
            },
            data: JSON.stringify({ method, arguments: keys }),
          };
          const resp = await axios.request(request);
          return resolve(resp.data);
        } catch (e) {
          if (e?.response?.status === 409) {
            this.sessionId = e.response.headers["x-transmission-session-id"];
            continue;
          }
          if (e?.response?.status === 401)
            throw "Unauthorized to access RPC Server";
          return reject(e);
        }
      }
    });
  }

  // Starts torrents
  // ids = int | list of ids | 'recently-active'
  startTorrents(ids) {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = Object.assign(ids && { ids });
        const resp = await this.http("torrent-start", payload);
        resolve(resp.result === "success" ? resp.arguments : null);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Start now torrents
  // ids = int | list of ids | 'recently-active'
  startNowTorrents(ids) {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = Object.assign(ids && { ids });
        const resp = await this.http("torrent-start-now", payload);
        resolve(resp.result === "success" ? resp.arguments : null);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Stop torrents
  // ids = int | list of ids | 'recently-active'
  stopTorrents(ids) {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = Object.assign(ids && { ids });
        const resp = await this.http("torrent-stop", payload);
        resolve(resp.result === "success" ? resp.arguments : null);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Verify torrents
  // ids = int | list of ids | 'recently-active'
  verifyTorrents(ids) {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = Object.assign(ids && { ids });
        const resp = await this.http("torrent-verify", payload);
        resolve(resp.result === "success" ? resp.arguments : null);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Reannounce torrents
  // ids = int | list of ids | 'recently-active'
  reannounceTorrents(ids) {
    return new Promise(async (resolve, reject) => {
      try {
        const payload = Object.assign(ids && { ids });
        const resp = await this.http("torrent-reannounce", payload);
        resolve(resp.result === "success" ? resp.arguments : null);
      } catch (e) {
        reject(e);
      }
    });
  }

  // fields = Object of fields with values
  // ex: { ids: [1, 2], uploadLimited: true }
  // Full list of fields and response details at:
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#32-torrent-mutator-torrent-set
  setTorrents(fields) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("torrent-set", fields);
        resolve(resp.result === "success" ? resp.arguments : null);
      } catch (e) {
        reject(e);
      }
    });
  }

  // ids = int | array of int (use ids 0 for all torrents )
  // fields = array of string
  // Full list of fields and response details at:
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#33-torrent-accessor-torrent-get
  getTorrents(
    ids = 0,
    fields = ["id", "name", "status", "downloadedEver", "uploadedEver"]
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("torrent-get", { fields, ids });
        resolve(resp.result === "success" ? resp.arguments : null);
      } catch (e) {
        reject(e);
      }
    });
  }

  // keys = object of key values
  // required keys : filename or metainfo(base64-encoded .torrent content)
  // see for full key list:
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#34-adding-a-torrent
  addTorrent(keys) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("torrent-add", keys);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // keys = object of key values
  // {ids = [1,2,3], "delete-local-data": false}
  // For further details:
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#35-removing-a-torrent
  removeTorrent(keys) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("torrent-remove", keys);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // keys = object of key values
  // {ids :[1,2,3], "location": "/new/path", move: true}
  // Will move if move is true, otherwise looks for file in new location
  //https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#36-moving-a-torrent
  moveTorrent(keys) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("torrent-set-location", keys);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // keys = object of key values
  // { ids:1, path:"/path/to/file", name:"/path/to/new_name"}
  // ids must be 1 torrent only
  renameTorrent(keys) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("torrent-rename-path", keys);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // keys = object of keys with new values
  // {speed-limit-down:15000}
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#411-mutators
  setSession(keys) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("session-set", keys);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // fields = array of strings of key names
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#412-accessors
  getSession(fields) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("session-get", { fields });
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#42-session-statistics
  sessionStats() {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("session-stats");
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#43-blocklist
  blocklistUpdate() {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("blocklist-update");
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#44-port-checking
  portTest() {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("blocklist-update");
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // doesn't seem to do much
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#45-session-shutdown
  disconnect() {
    return new Promise(async (resolve) => {
      try {
        await this.http("session-close");
        this.sessionId = null;
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  // ids = array of ids
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#46-queue-movement-requests
  queueMoveTop(ids) {
    return new Promise(async (resolve) => {
      try {
        const resp = await this.http("queue-move-top", ids);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // ids = array of ids
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#46-queue-movement-requests
  queueMoveUp(ids) {
    return new Promise(async (resolve) => {
      try {
        const resp = await this.http("queue-move-up", ids);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // ids = array of ids
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#46-queue-movement-requests
  queueMoveDown(ids) {
    return new Promise(async (resolve) => {
      try {
        const resp = await this.http("queue-move-down", ids);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // ids = array of ids
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#46-queue-movement-requests
  queueMoveBottom(ids) {
    return new Promise(async (resolve) => {
      try {
        const resp = await this.http("queue-move-bottom", ids);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Returns free space of drive
  freeSpace(path) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("free-space", { path });

        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Set Bandwidth groups *** Not implemented until transmission v4.0+
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#481-bandwidth-group-mutator-group-set
  groupSet(keys) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("group-set", keys);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Get Bandwidth groups *** Not implemented until transmission v4.0+
  // https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md#482-bandwidth-group-accessor-group-get
  groupGet(group) {
    return new Promise(async (resolve, reject) => {
      try {
        const resp = await this.http("group-get", group);
        resolve(resp.result === "success" ? resp.arguments : resp.result);
      } catch (e) {
        reject(e);
      }
    });
  }
}

module.exports = TransmissionRPCClient;
