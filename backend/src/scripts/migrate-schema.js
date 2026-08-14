/**
 * Head Hunters - Automated Database Schema Migration Script
 * 
 * Inspects MySQL database and automatically creates all missing tables,
 * adds any missing columns, and ensures proper timestamp defaults and constraints.
 * 
 * Usage:
 *   node backend/src/scripts/migrate-schema.js
 *   or: npm run db:migrate:schema
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// 1. Locate and load .env from multiple candidate paths
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

// 2. Parse connection details
function getDbConnectionConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      return {
        host: url.hostname || 'localhost',
        port: parseInt(url.port || '3306', 10),
        user: url.username ? decodeURIComponent(url.username) : 'root',
        password: url.password ? decodeURIComponent(url.password) : '',
        database: url.pathname ? decodeURIComponent(url.pathname.replace(/^\//, '')) : 'head_hunters_prod',
      };
    } catch (e) {
      console.warn('Could not parse DATABASE_URL as URL, falling back to individual env variables.');
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'head_hunters_prod',
  };
}

// 3. Schema Definitions
const TABLE_DEFINITIONS = {
  AdminUser: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`AdminUser\` (
        \`id\` varchar(191) NOT NULL,
        \`email\` varchar(191) NOT NULL,
        \`passwordHash\` varchar(191) NOT NULL,
        \`name\` varchar(191) NULL,
        \`role\` varchar(191) NOT NULL DEFAULT 'ADMIN',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`admin_user_email_idx\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      email: 'varchar(191) NOT NULL',
      passwordHash: 'varchar(191) NOT NULL',
      name: 'varchar(191) NULL',
      role: "varchar(191) NOT NULL DEFAULT 'ADMIN'",
      createdAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      updatedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    }
  },

  Permission: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`Permission\` (
        \`id\` varchar(191) NOT NULL,
        \`name\` varchar(191) NOT NULL,
        \`description\` varchar(191) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`permission_name_idx\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      name: 'varchar(191) NOT NULL',
      description: 'varchar(191) NULL',
    }
  },

  UserPermission: {
    createSql: `
      CREATE TABLE IF NOT EXISTS \`UserPermission\` (
        \`userId\` varchar(191) NOT NULL,
        \`permissionId\` varchar(191) NOT NULL,
        PRIMARY KEY (\`userId\`, \`permissionId\`),
        INDEX \`user_permission_user_id_idx\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      userId: 'varchar(191) NOT NULL',
      permissionId: 'varchar(191) NOT NULL',
    }
  },

  PasswordResetToken: {
    primaryKey: 'token',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`PasswordResetToken\` (
        \`token\` varchar(191) NOT NULL,
        \`email\` varchar(191) NOT NULL,
        \`expires\` datetime NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`token\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      token: 'varchar(191) NOT NULL',
      email: 'varchar(191) NOT NULL',
      expires: 'datetime NOT NULL',
      createdAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
    }
  },

  Job: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`Job\` (
        \`id\` varchar(191) NOT NULL,
        \`title\` varchar(191) NOT NULL,
        \`location\` varchar(191) NOT NULL,
        \`type\` varchar(191) NOT NULL,
        \`description\` text NOT NULL,
        \`status\` varchar(191) NOT NULL DEFAULT 'ACTIVE',
        \`isHot\` boolean NOT NULL DEFAULT false,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`job_status_idx\` (\`status\`),
        INDEX \`job_created_at_idx\` (\`createdAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      title: 'varchar(191) NOT NULL',
      location: 'varchar(191) NOT NULL',
      type: 'varchar(191) NOT NULL',
      description: 'text NOT NULL',
      status: "varchar(191) NOT NULL DEFAULT 'ACTIVE'",
      isHot: 'boolean NOT NULL DEFAULT false',
      createdAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      updatedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    }
  },

  Enquiry: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`Enquiry\` (
        \`id\` varchar(191) NOT NULL,
        \`name\` varchar(191) NOT NULL,
        \`email\` varchar(191) NOT NULL,
        \`phone\` varchar(191) NULL,
        \`type\` varchar(191) NOT NULL,
        \`message\` text NOT NULL,
        \`status\` varchar(191) NOT NULL DEFAULT 'NEW',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`enquiry_status_idx\` (\`status\`),
        INDEX \`enquiry_email_idx\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      name: 'varchar(191) NOT NULL',
      email: 'varchar(191) NOT NULL',
      phone: 'varchar(191) NULL',
      type: 'varchar(191) NOT NULL',
      message: 'text NOT NULL',
      status: "varchar(191) NOT NULL DEFAULT 'NEW'",
      createdAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      updatedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    }
  },

  Article: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`Article\` (
        \`id\` varchar(191) NOT NULL,
        \`title\` varchar(191) NOT NULL,
        \`slug\` varchar(191) NOT NULL,
        \`category\` varchar(191) NOT NULL,
        \`excerpt\` text NOT NULL,
        \`content\` text NOT NULL,
        \`isPublished\` boolean NOT NULL DEFAULT false,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`article_slug_idx\` (\`slug\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      title: 'varchar(191) NOT NULL',
      slug: 'varchar(191) NOT NULL',
      category: 'varchar(191) NOT NULL',
      excerpt: 'text NOT NULL',
      content: 'text NOT NULL',
      isPublished: 'boolean NOT NULL DEFAULT false',
      createdAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      updatedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    }
  },

  Content: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`Content\` (
        \`id\` varchar(191) NOT NULL,
        \`key\` varchar(191) NOT NULL,
        \`value\` text NOT NULL,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`content_key_idx\` (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      key: 'varchar(191) NOT NULL',
      value: 'text NOT NULL',
      updatedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    }
  },

  Candidate: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`Candidate\` (
        \`id\` varchar(191) NOT NULL,
        \`email\` varchar(191) NOT NULL,
        \`name\` varchar(191) NULL,
        \`phone\` varchar(191) NULL,
        \`phoneNormalized\` varchar(191) NULL,
        \`whatsapp\` varchar(191) NULL,
        \`whatsappNormalized\` varchar(191) NULL,
        \`location\` varchar(191) NULL,
        \`status\` varchar(191) NULL DEFAULT 'ACTIVE',
        \`source\` varchar(191) NULL DEFAULT 'WEBSITE',
        \`interestedJobs\` text NULL,
        \`cvFileName\` varchar(191) NULL,
        \`originalCvFileName\` varchar(191) NULL,
        \`consentAccepted\` boolean NOT NULL DEFAULT false,
        \`consentTimestamp\` timestamp NULL DEFAULT NULL,
        \`privacyPolicyVersion\` varchar(50) NULL DEFAULT '1.0',
        \`consentConversationId\` varchar(191) NULL,
        \`dateOfBirth\` datetime NULL DEFAULT NULL,
        \`parentalConsent\` boolean NULL DEFAULT false,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`candidate_email_idx\` (\`email\`),
        INDEX \`candidate_phone_idx\` (\`phone\`),
        INDEX \`candidate_whatsapp_idx\` (\`whatsapp\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      email: 'varchar(191) NOT NULL',
      name: 'varchar(191) NULL',
      phone: 'varchar(191) NULL',
      phoneNormalized: 'varchar(191) NULL',
      whatsapp: 'varchar(191) NULL',
      whatsappNormalized: 'varchar(191) NULL',
      location: 'varchar(191) NULL',
      status: "varchar(191) NULL DEFAULT 'ACTIVE'",
      source: "varchar(191) NULL DEFAULT 'WEBSITE'",
      interestedJobs: 'text NULL',
      cvFileName: 'varchar(191) NULL',
      originalCvFileName: 'varchar(191) NULL',
      consentAccepted: 'boolean NOT NULL DEFAULT false',
      consentTimestamp: 'timestamp NULL DEFAULT NULL',
      privacyPolicyVersion: "varchar(50) NULL DEFAULT '1.0'",
      consentConversationId: 'varchar(191) NULL',
      dateOfBirth: 'datetime NULL DEFAULT NULL',
      parentalConsent: 'boolean NULL DEFAULT false',
      createdAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      updatedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    }
  },

  CandidateConsent: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`CandidateConsent\` (
        \`id\` varchar(191) NOT NULL,
        \`candidateId\` varchar(191) NOT NULL,
        \`conversationId\` varchar(191) NULL,
        \`privacyPolicyVersion\` varchar(50) NOT NULL DEFAULT '1.0',
        \`consentType\` varchar(100) NOT NULL DEFAULT 'CANDIDATE_PROFILE_AND_CV',
        \`accepted\` boolean NOT NULL DEFAULT true,
        \`acceptedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`source\` varchar(50) NOT NULL DEFAULT 'AI_CHAT',
        PRIMARY KEY (\`id\`),
        INDEX \`candidate_consent_candidate_idx\` (\`candidateId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      candidateId: 'varchar(191) NOT NULL',
      conversationId: 'varchar(191) NULL',
      privacyPolicyVersion: "varchar(50) NOT NULL DEFAULT '1.0'",
      consentType: "varchar(100) NOT NULL DEFAULT 'CANDIDATE_PROFILE_AND_CV'",
      accepted: 'boolean NOT NULL DEFAULT true',
      acceptedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      source: "varchar(50) NOT NULL DEFAULT 'AI_CHAT'",
    }
  },

  ConsentHistory: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`ConsentHistory\` (
        \`id\` varchar(191) NOT NULL,
        \`candidateId\` varchar(191) NOT NULL,
        \`action\` varchar(50) NOT NULL,
        \`privacyPolicyVersion\` varchar(50) NOT NULL,
        \`source\` varchar(50) NOT NULL,
        \`timestamp\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      candidateId: 'varchar(191) NOT NULL',
      action: 'varchar(50) NOT NULL',
      privacyPolicyVersion: 'varchar(50) NOT NULL',
      source: 'varchar(50) NOT NULL',
      timestamp: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
    }
  },

  JobApplication: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`JobApplication\` (
        \`id\` varchar(191) NOT NULL,
        \`candidateId\` varchar(191) NOT NULL,
        \`jobId\` varchar(191) NOT NULL,
        \`applicationStatus\` varchar(191) NOT NULL DEFAULT 'SUBMITTED',
        \`source\` varchar(191) NOT NULL DEFAULT 'WEBSITE',
        \`conversationId\` varchar(191) NULL,
        \`appliedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`job_application_candidate_job_unique\` (\`candidateId\`, \`jobId\`),
        INDEX \`job_application_candidate_id_idx\` (\`candidateId\`),
        INDEX \`job_application_job_id_idx\` (\`jobId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      candidateId: 'varchar(191) NOT NULL',
      jobId: 'varchar(191) NOT NULL',
      applicationStatus: "varchar(191) NOT NULL DEFAULT 'SUBMITTED'",
      source: "varchar(191) NOT NULL DEFAULT 'WEBSITE'",
      conversationId: 'varchar(191) NULL',
      appliedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
    }
  },

  Conversation: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`Conversation\` (
        \`id\` varchar(191) NOT NULL,
        \`userId\` varchar(191) NOT NULL,
        \`status\` varchar(191) NOT NULL,
        \`takenBy\` varchar(191) NULL,
        \`needsHuman\` boolean NOT NULL DEFAULT false,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`mode\` varchar(191) NULL,
        \`chatStatus\` varchar(191) NULL,
        \`assignedAdminId\` varchar(191) NULL,
        \`aiModel\` varchar(191) NULL,
        \`knowledgeDocumentVersion\` varchar(191) NULL,
        \`lastRetrievalScore\` float NULL,
        \`handoffReason\` text NULL,
        \`humanSupportProvider\` varchar(191) NULL DEFAULT 'INTERNAL',
        \`handoffRequestedAt\` timestamp NULL DEFAULT NULL,
        \`tawkOpenedAt\` timestamp NULL DEFAULT NULL,
        \`agentJoinedAt\` timestamp NULL DEFAULT NULL,
        \`handoffCompletedAt\` timestamp NULL DEFAULT NULL,
        \`handoffFailureReason\` text NULL,
        \`workflowType\` varchar(50) NULL DEFAULT 'NONE',
        \`workflowState\` varchar(100) NULL DEFAULT 'IDLE',
        \`workflowData\` text NULL,
        \`workflowUpdatedAt\` timestamp NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`conversation_status_idx\` (\`status\`),
        INDEX \`conversation_user_id_idx\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      userId: 'varchar(191) NOT NULL',
      status: 'varchar(191) NOT NULL',
      takenBy: 'varchar(191) NULL',
      needsHuman: 'boolean NOT NULL DEFAULT false',
      createdAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      updatedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
      mode: 'varchar(191) NULL',
      chatStatus: 'varchar(191) NULL',
      assignedAdminId: 'varchar(191) NULL',
      aiModel: 'varchar(191) NULL',
      knowledgeDocumentVersion: 'varchar(191) NULL',
      lastRetrievalScore: 'float NULL',
      handoffReason: 'text NULL',
      humanSupportProvider: "varchar(191) NULL DEFAULT 'INTERNAL'",
      handoffRequestedAt: 'timestamp NULL DEFAULT NULL',
      tawkOpenedAt: 'timestamp NULL DEFAULT NULL',
      agentJoinedAt: 'timestamp NULL DEFAULT NULL',
      handoffCompletedAt: 'timestamp NULL DEFAULT NULL',
      handoffFailureReason: 'text NULL',
      workflowType: "varchar(50) NULL DEFAULT 'NONE'",
      workflowState: "varchar(100) NULL DEFAULT 'IDLE'",
      workflowData: 'text NULL',
      workflowUpdatedAt: 'timestamp NULL DEFAULT NULL',
    }
  },

  Message: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`Message\` (
        \`id\` varchar(191) NOT NULL,
        \`conversationId\` varchar(191) NOT NULL,
        \`senderType\` varchar(191) NOT NULL,
        \`content\` text NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`isReadByAdmin\` boolean NOT NULL DEFAULT false,
        \`sender\` varchar(191) NULL,
        \`grounded\` boolean NULL,
        \`retrievedChunkIds\` text NULL,
        \`modelName\` varchar(191) NULL,
        \`latencyMs\` int NULL,
        \`errorCode\` varchar(191) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`message_conversation_id_idx\` (\`conversationId\`),
        INDEX \`message_created_at_idx\` (\`createdAt\`),
        INDEX \`message_sender_type_idx\` (\`senderType\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      conversationId: 'varchar(191) NOT NULL',
      senderType: 'varchar(191) NOT NULL',
      content: 'text NOT NULL',
      createdAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      isReadByAdmin: 'boolean NOT NULL DEFAULT false',
      sender: 'varchar(191) NULL',
      grounded: 'boolean NULL',
      retrievedChunkIds: 'text NULL',
      modelName: 'varchar(191) NULL',
      latencyMs: 'int NULL',
      errorCode: 'varchar(191) NULL',
    }
  },

  KnowledgeDocument: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`KnowledgeDocument\` (
        \`id\` varchar(191) NOT NULL,
        \`title\` varchar(191) NOT NULL,
        \`fileName\` varchar(191) NOT NULL,
        \`version\` varchar(191) NOT NULL,
        \`status\` varchar(191) NOT NULL,
        \`checksum\` varchar(191) NOT NULL,
        \`uploadedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`uploadedBy\` varchar(191) NULL,
        \`indexedAt\` timestamp NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      title: 'varchar(191) NOT NULL',
      fileName: 'varchar(191) NOT NULL',
      version: 'varchar(191) NOT NULL',
      status: 'varchar(191) NOT NULL',
      checksum: 'varchar(191) NOT NULL',
      uploadedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      uploadedBy: 'varchar(191) NULL',
      indexedAt: 'timestamp NULL DEFAULT NULL',
    }
  },

  KnowledgeChunk: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`KnowledgeChunk\` (
        \`id\` varchar(191) NOT NULL,
        \`documentId\` varchar(191) NOT NULL,
        \`documentVersion\` varchar(191) NOT NULL,
        \`sectionTitle\` varchar(191) NULL,
        \`pageNumber\` int NULL,
        \`chunkIndex\` int NOT NULL,
        \`contentHash\` varchar(191) NOT NULL,
        \`tokenCount\` int NOT NULL,
        \`vectorRecordId\` varchar(191) NOT NULL,
        \`status\` varchar(191) NOT NULL DEFAULT 'ACTIVE',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`knowledge_chunk_document_id_idx\` (\`documentId\`),
        INDEX \`knowledge_chunk_vector_record_id_idx\` (\`vectorRecordId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      documentId: 'varchar(191) NOT NULL',
      documentVersion: 'varchar(191) NOT NULL',
      sectionTitle: 'varchar(191) NULL',
      pageNumber: 'int NULL',
      chunkIndex: 'int NOT NULL',
      contentHash: 'varchar(191) NOT NULL',
      tokenCount: 'int NOT NULL',
      vectorRecordId: 'varchar(191) NOT NULL',
      status: "varchar(191) NOT NULL DEFAULT 'ACTIVE'",
      createdAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
    }
  },

  Employer: {
    primaryKey: 'id',
    createSql: `
      CREATE TABLE IF NOT EXISTS \`Employer\` (
        \`id\` varchar(191) NOT NULL,
        \`email\` varchar(191) NOT NULL,
        \`name\` varchar(191) NULL,
        \`dateOfBirth\` datetime NOT NULL,
        \`parentalConsent\` boolean NOT NULL DEFAULT false,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`employer_email_idx\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    columns: {
      id: 'varchar(191) NOT NULL',
      email: 'varchar(191) NOT NULL',
      name: 'varchar(191) NULL',
      dateOfBirth: 'datetime NOT NULL',
      parentalConsent: 'boolean NOT NULL DEFAULT false',
      createdAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      updatedAt: 'timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    }
  }
};

// 4. Main Migration Engine
async function runAutoMigration() {
  console.log('===================================================');
  console.log('  Head Hunters - Automated Schema Migration');
  console.log('===================================================\n');

  const config = getDbConnectionConfig();
  console.log(`📡 Connecting to MySQL: ${config.user}@${config.host}:${config.port}/${config.database} ...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully to MySQL database!\n');
  } catch (err) {
    console.error('❌ Failed to connect to MySQL database:', err.message);
    process.exit(1);
  }

  let totalAddedColumns = 0;
  let totalCreatedTables = 0;

  try {
    // Get list of existing tables in database
    const [tableRows] = await connection.query('SHOW TABLES');
    const existingTableNames = new Set(tableRows.map((r) => Object.values(r)[0].toLowerCase()));

    for (const [tableName, def] of Object.entries(TABLE_DEFINITIONS)) {
      const lowerTableName = tableName.toLowerCase();

      // 1. Create table if missing
      if (!existingTableNames.has(lowerTableName)) {
        console.log(`📦 Table \`${tableName}\` does not exist. Creating table...`);
        await connection.query(def.createSql);
        totalCreatedTables++;
        console.log(`   ✓ Created table \`${tableName}\` successfully.`);
      } else {
        // Table exists, inspect columns
        const [columnRows] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
        const existingColumns = new Map(columnRows.map((c) => [c.Field.toLowerCase(), c.Field]));

        // Check for missing columns
        for (const [colName, colDef] of Object.entries(def.columns)) {
          if (!existingColumns.has(colName.toLowerCase())) {
            console.log(`➕ Table \`${tableName}\` is missing column \`${colName}\`. Adding column...`);
            try {
              await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${colDef}`);
              totalAddedColumns++;
              console.log(`   ✓ Added column \`${colName}\` to \`${tableName}\`.`);
            } catch (colErr) {
              console.warn(`   ⚠️ Could not add column \`${colName}\` to \`${tableName}\`:`, colErr.message);
            }
          }
        }
      }

      // 2. Fix timestamp defaults and nullability where applicable
      try {
        if (def.columns.createdAt) {
          await connection.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        }
      } catch (e) {}

      try {
        if (def.columns.updatedAt) {
          await connection.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        }
      } catch (e) {}
    }

    // Relax legacy columns on Candidate if present
    try {
      await connection.query('ALTER TABLE `Candidate` MODIFY COLUMN `dateOfBirth` DATETIME NULL DEFAULT NULL');
      await connection.query('ALTER TABLE `Candidate` MODIFY COLUMN `parentalConsent` BOOLEAN NULL DEFAULT FALSE');
    } catch (e) {}

    console.log('\n===================================================');
    console.log(` Migration Completed!`);
    console.log(` • New tables created:  ${totalCreatedTables}`);
    console.log(` • Missing columns added: ${totalAddedColumns}`);
    console.log('===================================================\n');

    // Display summary of all tables and column counts
    const [finalTables] = await connection.query('SHOW TABLES');
    console.log('📊 Current Database Status:');
    for (const t of finalTables) {
      const name = Object.values(t)[0];
      const [cols] = await connection.query(`SHOW COLUMNS FROM \`${name}\``);
      console.log(` • ${name.padEnd(22)} (${cols.length} columns)`);
    }

  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
runAutoMigration().then(() => {
  console.log('\n✅ Database schema is 100% synchronized and ready.');
  process.exit(0);
}).catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
