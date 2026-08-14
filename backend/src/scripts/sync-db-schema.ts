import { pool } from '../lib/db';

async function addColumnIfNotExists(table: string, column: string, definition: string) {
  try {
    const [rows]: any = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (rows.length === 0) {
      console.log(`Adding column '${column}' to table '${table}'...`);
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    }
  } catch (err: any) {
    console.warn(`Error adding column '${column}' to '${table}':`, err.message);
  }
}

async function syncDbSchema() {
  console.log('🔄 Checking and synchronizing database columns with schema...');

  // Conversation columns
  await addColumnIfNotExists('Conversation', 'mode', 'varchar(191) NULL');
  await addColumnIfNotExists('Conversation', 'chatStatus', 'varchar(191) NULL');
  await addColumnIfNotExists('Conversation', 'assignedAdminId', 'varchar(191) NULL');
  await addColumnIfNotExists('Conversation', 'aiModel', 'varchar(191) NULL');
  await addColumnIfNotExists('Conversation', 'knowledgeDocumentVersion', 'varchar(191) NULL');
  await addColumnIfNotExists('Conversation', 'lastRetrievalScore', 'float NULL');
  await addColumnIfNotExists('Conversation', 'handoffReason', 'text NULL');
  await addColumnIfNotExists('Conversation', 'humanSupportProvider', "varchar(191) DEFAULT 'INTERNAL'");
  await addColumnIfNotExists('Conversation', 'handoffRequestedAt', 'timestamp NULL DEFAULT NULL');
  await addColumnIfNotExists('Conversation', 'tawkOpenedAt', 'timestamp NULL DEFAULT NULL');
  await addColumnIfNotExists('Conversation', 'agentJoinedAt', 'timestamp NULL DEFAULT NULL');
  await addColumnIfNotExists('Conversation', 'handoffCompletedAt', 'timestamp NULL DEFAULT NULL');
  await addColumnIfNotExists('Conversation', 'handoffFailureReason', 'text NULL');
  await addColumnIfNotExists('Conversation', 'workflowType', "varchar(50) DEFAULT 'NONE'");
  await addColumnIfNotExists('Conversation', 'workflowState', "varchar(100) DEFAULT 'IDLE'");
  await addColumnIfNotExists('Conversation', 'workflowData', 'text NULL');
  await addColumnIfNotExists('Conversation', 'workflowUpdatedAt', 'timestamp NULL DEFAULT NULL');

  // Message columns
  await addColumnIfNotExists('Message', 'sender', 'varchar(191) NULL');
  await addColumnIfNotExists('Message', 'grounded', 'boolean NULL');
  await addColumnIfNotExists('Message', 'retrievedChunkIds', 'text NULL');
  await addColumnIfNotExists('Message', 'modelName', 'varchar(191) NULL');
  await addColumnIfNotExists('Message', 'latencyMs', 'int NULL');
  await addColumnIfNotExists('Message', 'errorCode', 'varchar(191) NULL');

  // Candidate columns
  await addColumnIfNotExists('Candidate', 'phone', 'varchar(191) NULL');
  await addColumnIfNotExists('Candidate', 'phoneNormalized', 'varchar(191) NULL');
  await addColumnIfNotExists('Candidate', 'whatsapp', 'varchar(191) NULL');
  await addColumnIfNotExists('Candidate', 'whatsappNormalized', 'varchar(191) NULL');
  await addColumnIfNotExists('Candidate', 'interestedJobs', 'text NULL');
  await addColumnIfNotExists('Candidate', 'cvFileName', 'varchar(191) NULL');
  await addColumnIfNotExists('Candidate', 'originalCvFileName', 'varchar(191) NULL');
  await addColumnIfNotExists('Candidate', 'consentAccepted', 'boolean NOT NULL DEFAULT false');
  await addColumnIfNotExists('Candidate', 'consentTimestamp', 'timestamp NULL DEFAULT NULL');
  await addColumnIfNotExists('Candidate', 'privacyPolicyVersion', "varchar(50) DEFAULT '1.0'");
  await addColumnIfNotExists('Candidate', 'consentConversationId', 'varchar(191) NULL');

  // Create tables if not exist
  const createTableStatements = [
    `CREATE TABLE IF NOT EXISTS \`KnowledgeChunk\` (
      \`id\` varchar(191) NOT NULL,
      \`documentId\` varchar(191) NOT NULL,
      \`documentVersion\` varchar(191) NOT NULL,
      \`sectionTitle\` varchar(191),
      \`pageNumber\` int,
      \`chunkIndex\` int NOT NULL,
      \`contentHash\` varchar(191) NOT NULL,
      \`tokenCount\` int NOT NULL,
      \`vectorRecordId\` varchar(191) NOT NULL,
      \`status\` varchar(191) NOT NULL DEFAULT 'ACTIVE',
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`knowledge_chunk_document_id_idx\` (\`documentId\`),
      INDEX \`knowledge_chunk_vector_record_id_idx\` (\`vectorRecordId\`)
    )`,

    `CREATE TABLE IF NOT EXISTS \`KnowledgeDocument\` (
      \`id\` varchar(191) NOT NULL,
      \`title\` varchar(191) NOT NULL,
      \`fileName\` varchar(191) NOT NULL,
      \`version\` varchar(191) NOT NULL,
      \`status\` varchar(191) NOT NULL,
      \`checksum\` varchar(191) NOT NULL,
      \`uploadedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`uploadedBy\` varchar(191),
      \`indexedAt\` timestamp NULL DEFAULT NULL,
      PRIMARY KEY (\`id\`)
    )`,

    `CREATE TABLE IF NOT EXISTS \`CandidateConsent\` (
      \`id\` varchar(191) NOT NULL,
      \`candidateId\` varchar(191) NOT NULL,
      \`conversationId\` varchar(191),
      \`privacyPolicyVersion\` varchar(50) NOT NULL DEFAULT '1.0',
      \`consentType\` varchar(100) NOT NULL DEFAULT 'CANDIDATE_PROFILE_AND_CV',
      \`accepted\` boolean NOT NULL DEFAULT true,
      \`acceptedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    )`,

    `CREATE TABLE IF NOT EXISTS \`JobApplication\` (
      \`id\` varchar(191) NOT NULL,
      \`jobId\` varchar(191) NOT NULL,
      \`candidateId\` varchar(191) NOT NULL,
      \`conversationId\` varchar(191),
      \`status\` varchar(191) NOT NULL DEFAULT 'SUBMITTED',
      \`appliedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`job_candidate_unique\` (\`jobId\`, \`candidateId\`)
    )`,

    `CREATE TABLE IF NOT EXISTS \`ConsentHistory\` (
      \`id\` varchar(191) NOT NULL,
      \`candidateId\` varchar(191) NOT NULL,
      \`action\` varchar(50) NOT NULL,
      \`privacyPolicyVersion\` varchar(50) NOT NULL,
      \`source\` varchar(50) NOT NULL,
      \`timestamp\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    )`
  ];

  for (const q of createTableStatements) {
    try {
      await pool.query(q);
    } catch (err: any) {
      console.warn(`Error creating table:`, err.message);
    }
  }

  console.log('✅ Database schema synchronized successfully with all tables and columns.');
  await pool.end();
}

syncDbSchema().catch((err) => {
  console.error('Failed to sync schema:', err);
  process.exit(1);
});
