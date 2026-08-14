"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../lib/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../../.env') });
async function main() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
        console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variable');
        process.exit(1);
    }
    const hash = await bcryptjs_1.default.hash(password, 12);
    try {
        const existing = await db_1.db.select().from(schema_1.adminUser).where((0, drizzle_orm_1.eq)(schema_1.adminUser.email, email)).limit(1);
        if (existing.length > 0) {
            if (process.env.FORCE_UPDATE_PASSWORD === 'true') {
                await db_1.db.update(schema_1.adminUser).set({ passwordHash: hash }).where((0, drizzle_orm_1.eq)(schema_1.adminUser.email, email));
                console.log(`Admin user ${email} password updated.`);
            }
            else {
                console.log(`Admin user ${email} already exists. Skipping creation.`);
            }
            process.exit(0);
        }
        await db_1.db.insert(schema_1.adminUser).values({
            email,
            name: 'System Administrator',
            passwordHash: hash,
            role: 'SUPER_ADMIN',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        console.log(`Successfully created admin user: ${email}`);
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to seed admin:', error);
        process.exit(1);
    }
}
main().catch(console.error);
