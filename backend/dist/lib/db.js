"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseUrl = exports.pool = exports.db = void 0;
const mysql2_1 = require("drizzle-orm/mysql2");
const promise_1 = __importDefault(require("mysql2/promise"));
const schema = __importStar(require("../db/schema"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Find and load .env file from multiple possible paths
const candidateEnvPaths = [
    path_1.default.resolve(process.cwd(), ".env"),
    path_1.default.resolve(__dirname, ".env"),
    path_1.default.resolve(__dirname, "../.env"),
    path_1.default.resolve(__dirname, "../../.env"),
    path_1.default.resolve(__dirname, "../../../.env"),
];
for (const envPath of candidateEnvPaths) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
        break;
    }
}
// Fallback to default dotenv config if none of specific paths matched
dotenv_1.default.config();
// Determine database connection URL from .env
function getDatabaseUrl() {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }
    if (process.env.DATABASE_MIGRATION_URL) {
        return process.env.DATABASE_MIGRATION_URL;
    }
    if (process.env.MYSQL_URL) {
        return process.env.MYSQL_URL;
    }
    // Construct from individual environment variables if available
    const host = process.env.DB_HOST || process.env.MYSQL_HOST;
    const user = process.env.DB_USER || process.env.MYSQL_USER;
    const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "";
    const database = process.env.DB_NAME || process.env.MYSQL_DATABASE;
    const port = process.env.DB_PORT || process.env.MYSQL_PORT || "3306";
    if (host && user && database) {
        const encodedPassword = encodeURIComponent(password);
        return `mysql://${user}:${encodedPassword}@${host}:${port}/${database}`;
    }
    throw new Error("Missing database connection settings in .env! Please set DATABASE_URL (e.g. mysql://user:password@localhost:3306/dbname) or individual DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env");
}
const databaseUrl = getDatabaseUrl();
exports.databaseUrl = databaseUrl;
const sslEnabled = process.env.DATABASE_SSL === "true" || process.env.MYSQL_SSL === "true";
// Create one shared MySQL pool for the process
const pool = promise_1.default.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: Number(process.env.DATABASE_POOL_LIMIT || 10),
    timezone: "Z",
    charset: "utf8mb4",
    ssl: sslEnabled
        ? {
            rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
        }
        : undefined,
});
exports.pool = pool;
exports.db = (0, mysql2_1.drizzle)(pool, { schema, mode: "planetscale" });
