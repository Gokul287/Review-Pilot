/**
 * Shared utility functions.
 */

export function formatDate(date) {
    return new Date(date).toISOString();
}

export function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function truncate(str, len = 100) {
    return str.length > len ? str.slice(0, len) + '...' : str;
}

// ISSUE 6: Function exceeds 50-line performance budget
export function processUserData(user) {
    const result = {};
    result.id = user.id;
    result.name = user.name;
    result.email = user.email;
    result.phone = user.phone;
    result.address = user.address;
    result.city = user.city;
    result.state = user.state;
    result.zip = user.zip;
    result.country = user.country;
    result.timezone = user.timezone;
    result.locale = user.locale;
    result.currency = user.currency;
    result.avatar = user.avatar;
    result.bio = user.bio;
    result.website = user.website;
    result.company = user.company;
    result.title = user.title;
    result.department = user.department;
    result.team = user.team;
    result.manager = user.manager;
    result.hireDate = user.hireDate;
    result.role = user.role;
    result.permissions = user.permissions;
    result.lastLogin = user.lastLogin;
    result.loginCount = user.loginCount;
    result.failedLogins = user.failedLogins;
    result.mfaEnabled = user.mfaEnabled;
    result.mfaType = user.mfaType;
    result.preferences = user.preferences;
    result.notifications = user.notifications;
    result.theme = user.theme;
    result.language = user.language;
    result.accessibility = user.accessibility;
    result.billing = user.billing;
    result.subscription = user.subscription;
    result.plan = user.plan;
    result.usage = user.usage;
    result.quota = user.quota;
    result.storage = user.storage;
    result.bandwidth = user.bandwidth;
    result.apiCalls = user.apiCalls;
    result.webhooks = user.webhooks;
    result.integrations = user.integrations;
    result.oauth = user.oauth;
    result.sso = user.sso;
    result.audit = user.audit;
    result.compliance = user.compliance;
    result.gdpr = user.gdpr;
    result.dataRetention = user.dataRetention;
    result.backup = user.backup;
    result.recovery = user.recovery;
    result.status = user.status;
    result.verified = user.verified;
    result.createdAt = user.createdAt;
    result.updatedAt = user.updatedAt;
    return result;
}
