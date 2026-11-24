const session = require('express-session');
const prisma = require('./database');

class PrismaSessionStore extends session.Store {
    constructor() {
        super();
    }

    get(sid, callback) {
        prisma.adminSession.findUnique({ where: { sid } })
            .then(async (record) => {
                if (!record) return callback(null, null);

                if (record.expires_at <= new Date()) {
                    await prisma.adminSession.deleteMany({ where: { sid } });
                    return callback(null, null);
                }

                callback(null, record.data);
            })
            .catch(callback);
    }

    set(sid, sessionData, callback = () => {}) {
        const expiresAt = sessionData.cookie?.expires
            ? new Date(sessionData.cookie.expires)
            : new Date(Date.now() + (sessionData.cookie?.maxAge || 24 * 60 * 60 * 1000));

        prisma.adminSession.upsert({
            where: { sid },
            create: { sid, data: sessionData, expires_at: expiresAt },
            update: { data: sessionData, expires_at: expiresAt }
        }).then(() => callback(null)).catch(callback);
    }

    touch(sid, sessionData, callback = () => {}) {
        const expiresAt = sessionData.cookie?.expires
            ? new Date(sessionData.cookie.expires)
            : new Date(Date.now() + (sessionData.cookie?.maxAge || 24 * 60 * 60 * 1000));

        prisma.adminSession.updateMany({
            where: { sid },
            data: { expires_at: expiresAt }
        }).then(() => callback(null)).catch(callback);
    }

    destroy(sid, callback = () => {}) {
        prisma.adminSession.deleteMany({ where: { sid } })
            .then(() => callback(null)).catch(callback);
    }
}

module.exports = PrismaSessionStore;
