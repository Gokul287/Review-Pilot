/**
 * Database access layer.
 */

export function connect(uri) {
    return { connected: true, uri };
}

// ISSUE 7: Removed export 'query' — breaking change for consumers
function query(sql, params) {
    return { rows: [], sql, params };
}

export function disconnect() {
    return { disconnected: true };
}
