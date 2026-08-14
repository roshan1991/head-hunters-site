"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userPermissionRelations = exports.permissionRelations = exports.adminUserRelations = exports.messageRelations = exports.conversationRelations = exports.passwordResetToken = exports.userPermission = exports.permission = exports.employer = exports.jobApplication = exports.candidateConsent = exports.candidate = exports.adminUser = exports.message = exports.conversation = exports.knowledgeChunk = exports.knowledgeDocument = exports.article = exports.content = exports.enquiry = exports.job = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = __importDefault(require("crypto"));
const utcTimestamp = (name) => (0, mysql_core_1.timestamp)(name, { mode: 'date' });
const utcDateTime = (name) => (0, mysql_core_1.datetime)(name, { mode: 'date' });
const createdAtTimestamp = (name = 'createdAt') => utcTimestamp(name).notNull().defaultNow().$defaultFn(() => new Date());
const updatedAtTimestamp = (name = 'updatedAt') => utcTimestamp(name).notNull().defaultNow().$defaultFn(() => new Date()).$onUpdateFn(() => new Date());
exports.job = (0, mysql_core_1.mysqlTable)('Job', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    title: (0, mysql_core_1.varchar)('title', { length: 191 }).notNull(),
    location: (0, mysql_core_1.varchar)('location', { length: 191 }).notNull(),
    type: (0, mysql_core_1.varchar)('type', { length: 191 }).notNull(), // CASUAL, PERMANENT, REMOTE, EXECUTIVE
    description: (0, mysql_core_1.text)('description').notNull(),
    status: (0, mysql_core_1.varchar)('status', { length: 191 }).notNull().default('ACTIVE'), // ACTIVE, CLOSED, DRAFT
    isHot: (0, mysql_core_1.boolean)('isHot').notNull().default(false),
    createdAt: createdAtTimestamp('createdAt'),
    updatedAt: updatedAtTimestamp('updatedAt'),
}, (table) => {
    return {
        statusIdx: (0, mysql_core_1.index)('job_status_idx').on(table.status),
        createdAtIdx: (0, mysql_core_1.index)('job_created_at_idx').on(table.createdAt),
    };
});
exports.enquiry = (0, mysql_core_1.mysqlTable)('Enquiry', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    name: (0, mysql_core_1.varchar)('name', { length: 191 }).notNull(),
    email: (0, mysql_core_1.varchar)('email', { length: 191 }).notNull(),
    phone: (0, mysql_core_1.varchar)('phone', { length: 191 }),
    type: (0, mysql_core_1.varchar)('type', { length: 191 }).notNull(), // HIRING, CANDIDATE, GENERAL
    message: (0, mysql_core_1.text)('message').notNull(),
    status: (0, mysql_core_1.varchar)('status', { length: 191 }).notNull().default('NEW'), // NEW, READ, ASSIGNED, ARCHIVED
    createdAt: createdAtTimestamp('createdAt'),
    updatedAt: updatedAtTimestamp('updatedAt'),
}, (table) => {
    return {
        statusIdx: (0, mysql_core_1.index)('enquiry_status_idx').on(table.status),
        emailIdx: (0, mysql_core_1.index)('enquiry_email_idx').on(table.email),
    };
});
exports.content = (0, mysql_core_1.mysqlTable)('Content', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    key: (0, mysql_core_1.varchar)('key', { length: 191 }).notNull().unique(),
    value: (0, mysql_core_1.text)('value').notNull(),
    updatedAt: updatedAtTimestamp('updatedAt'),
});
exports.article = (0, mysql_core_1.mysqlTable)('Article', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    title: (0, mysql_core_1.varchar)('title', { length: 191 }).notNull(),
    slug: (0, mysql_core_1.varchar)('slug', { length: 191 }).notNull().unique(),
    category: (0, mysql_core_1.varchar)('category', { length: 191 }).notNull(),
    excerpt: (0, mysql_core_1.text)('excerpt').notNull(),
    content: (0, mysql_core_1.text)('content').notNull(),
    isPublished: (0, mysql_core_1.boolean)('isPublished').notNull().default(false),
    createdAt: createdAtTimestamp('createdAt'),
    updatedAt: updatedAtTimestamp('updatedAt'),
});
exports.knowledgeDocument = (0, mysql_core_1.mysqlTable)('KnowledgeDocument', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    title: (0, mysql_core_1.varchar)('title', { length: 191 }).notNull(),
    fileName: (0, mysql_core_1.varchar)('fileName', { length: 191 }).notNull(),
    version: (0, mysql_core_1.varchar)('version', { length: 191 }).notNull(),
    status: (0, mysql_core_1.varchar)('status', { length: 191 }).notNull(), // DRAFT, PROCESSING, INDEXED, APPROVED, INACTIVE, FAILED
    checksum: (0, mysql_core_1.varchar)('checksum', { length: 191 }).notNull(),
    uploadedAt: createdAtTimestamp('uploadedAt'),
    uploadedBy: (0, mysql_core_1.varchar)('uploadedBy', { length: 191 }),
    indexedAt: utcTimestamp('indexedAt'),
});
exports.knowledgeChunk = (0, mysql_core_1.mysqlTable)('KnowledgeChunk', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    documentId: (0, mysql_core_1.varchar)('documentId', { length: 191 }).notNull(),
    documentVersion: (0, mysql_core_1.varchar)('documentVersion', { length: 191 }).notNull(),
    sectionTitle: (0, mysql_core_1.varchar)('sectionTitle', { length: 191 }),
    pageNumber: (0, mysql_core_1.int)('pageNumber'),
    chunkIndex: (0, mysql_core_1.int)('chunkIndex').notNull(),
    contentHash: (0, mysql_core_1.varchar)('contentHash', { length: 191 }).notNull(),
    tokenCount: (0, mysql_core_1.int)('tokenCount').notNull(),
    vectorRecordId: (0, mysql_core_1.varchar)('vectorRecordId', { length: 191 }).notNull(),
    status: (0, mysql_core_1.varchar)('status', { length: 191 }).notNull().default('ACTIVE'),
    createdAt: createdAtTimestamp('createdAt'),
}, (table) => {
    return {
        documentIdIdx: (0, mysql_core_1.index)('knowledge_chunk_document_id_idx').on(table.documentId),
        vectorRecordIdIdx: (0, mysql_core_1.index)('knowledge_chunk_vector_record_id_idx').on(table.vectorRecordId),
    };
});
exports.conversation = (0, mysql_core_1.mysqlTable)('Conversation', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    userId: (0, mysql_core_1.varchar)('userId', { length: 191 }).notNull(),
    status: (0, mysql_core_1.varchar)('status', { length: 191 }).notNull(), // BOT_ACTIVE, HUMAN_ACTIVE, CLOSED
    takenBy: (0, mysql_core_1.varchar)('takenBy', { length: 191 }),
    needsHuman: (0, mysql_core_1.boolean)('needsHuman').notNull().default(false),
    createdAt: createdAtTimestamp('createdAt'),
    updatedAt: updatedAtTimestamp('updatedAt'),
    mode: (0, mysql_core_1.varchar)('mode', { length: 191 }), // AI, HUMAN, CLOSED
    chatStatus: (0, mysql_core_1.varchar)('chatStatus', { length: 191 }), // OPEN, WAITING_FOR_ADMIN, RESOLVED
    assignedAdminId: (0, mysql_core_1.varchar)('assignedAdminId', { length: 191 }),
    aiModel: (0, mysql_core_1.varchar)('aiModel', { length: 191 }),
    knowledgeDocumentVersion: (0, mysql_core_1.varchar)('knowledgeDocumentVersion', { length: 191 }),
    lastRetrievalScore: (0, mysql_core_1.float)('lastRetrievalScore'),
    handoffReason: (0, mysql_core_1.text)('handoffReason'), // Reason visitor requested human support (DO NOT repurpose)
    humanSupportProvider: (0, mysql_core_1.varchar)('humanSupportProvider', { length: 191 }).default('INTERNAL'),
    handoffRequestedAt: utcTimestamp('handoffRequestedAt'),
    tawkOpenedAt: utcTimestamp('tawkOpenedAt'),
    agentJoinedAt: utcTimestamp('agentJoinedAt'),
    handoffCompletedAt: utcTimestamp('handoffCompletedAt'),
    handoffFailureReason: (0, mysql_core_1.text)('handoffFailureReason'),
    workflowType: (0, mysql_core_1.varchar)('workflowType', { length: 50 }).default('NONE'), // NONE | CANDIDATE | EMPLOYER | JOB_APPLICATION | HUMAN_HANDOFF
    workflowState: (0, mysql_core_1.varchar)('workflowState', { length: 100 }).default('IDLE'), // e.g. IDLE | EMPLOYER_COLLECTING_NAME | ...
    workflowData: (0, mysql_core_1.text)('workflowData'), // JSON-serialised collected data
    workflowUpdatedAt: utcTimestamp('workflowUpdatedAt'),
}, (table) => {
    return {
        statusIdx: (0, mysql_core_1.index)('conversation_status_idx').on(table.status),
        userIdIdx: (0, mysql_core_1.index)('conversation_user_id_idx').on(table.userId),
    };
});
exports.message = (0, mysql_core_1.mysqlTable)('Message', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    conversationId: (0, mysql_core_1.varchar)('conversationId', { length: 191 }).notNull(),
    senderType: (0, mysql_core_1.varchar)('senderType', { length: 191 }).notNull(), // USER, ADMIN, BOT
    content: (0, mysql_core_1.text)('content').notNull(),
    createdAt: createdAtTimestamp('createdAt'),
    isReadByAdmin: (0, mysql_core_1.boolean)('isReadByAdmin').notNull().default(false),
    sender: (0, mysql_core_1.varchar)('sender', { length: 191 }), // USER, AI, ADMIN, SYSTEM
    grounded: (0, mysql_core_1.boolean)('grounded'),
    retrievedChunkIds: (0, mysql_core_1.text)('retrievedChunkIds'),
    modelName: (0, mysql_core_1.varchar)('modelName', { length: 191 }),
    latencyMs: (0, mysql_core_1.int)('latencyMs'),
    errorCode: (0, mysql_core_1.varchar)('errorCode', { length: 191 }),
}, (table) => {
    return {
        conversationIdIdx: (0, mysql_core_1.index)('message_conversation_id_idx').on(table.conversationId),
        createdAtIdx: (0, mysql_core_1.index)('message_created_at_idx').on(table.createdAt),
        senderTypeIdx: (0, mysql_core_1.index)('message_sender_type_idx').on(table.senderType),
    };
});
exports.adminUser = (0, mysql_core_1.mysqlTable)('AdminUser', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    email: (0, mysql_core_1.varchar)('email', { length: 191 }).notNull().unique(),
    passwordHash: (0, mysql_core_1.varchar)('passwordHash', { length: 191 }).notNull(),
    name: (0, mysql_core_1.varchar)('name', { length: 191 }),
    role: (0, mysql_core_1.varchar)('role', { length: 191 }).notNull().default('ADMIN'), // SUPER_ADMIN, ADMIN, USER
    createdAt: createdAtTimestamp('createdAt'),
    updatedAt: updatedAtTimestamp('updatedAt'),
}, (table) => {
    return {
        emailIdx: (0, mysql_core_1.index)('admin_user_email_idx').on(table.email),
    };
});
exports.candidate = (0, mysql_core_1.mysqlTable)('Candidate', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    email: (0, mysql_core_1.varchar)('email', { length: 191 }).notNull().unique(),
    name: (0, mysql_core_1.varchar)('name', { length: 191 }),
    phone: (0, mysql_core_1.varchar)('phone', { length: 191 }),
    phoneNormalized: (0, mysql_core_1.varchar)('phoneNormalized', { length: 191 }),
    whatsapp: (0, mysql_core_1.varchar)('whatsapp', { length: 191 }),
    whatsappNormalized: (0, mysql_core_1.varchar)('whatsappNormalized', { length: 191 }),
    location: (0, mysql_core_1.varchar)('location', { length: 191 }),
    status: (0, mysql_core_1.varchar)('status', { length: 191 }).default('ACTIVE'), // ACTIVE, INCOMPLETE, ARCHIVED
    source: (0, mysql_core_1.varchar)('source', { length: 191 }).default('WEBSITE'), // AI_CHAT, WEBSITE
    interestedJobs: (0, mysql_core_1.text)('interestedJobs'),
    cvFileName: (0, mysql_core_1.varchar)('cvFileName', { length: 191 }),
    originalCvFileName: (0, mysql_core_1.varchar)('originalCvFileName', { length: 191 }),
    consentAccepted: (0, mysql_core_1.boolean)('consentAccepted').notNull().default(false),
    consentTimestamp: utcTimestamp('consentTimestamp'),
    privacyPolicyVersion: (0, mysql_core_1.varchar)('privacyPolicyVersion', { length: 50 }).default('1.0'),
    consentConversationId: (0, mysql_core_1.varchar)('consentConversationId', { length: 191 }),
    createdAt: createdAtTimestamp('createdAt'),
    updatedAt: updatedAtTimestamp('updatedAt'),
}, (table) => {
    return {
        emailIdx: (0, mysql_core_1.index)('candidate_email_idx').on(table.email),
        phoneIdx: (0, mysql_core_1.index)('candidate_phone_idx').on(table.phone),
        phoneNormalizedIdx: (0, mysql_core_1.index)('candidate_phone_normalized_idx').on(table.phoneNormalized),
        whatsappIdx: (0, mysql_core_1.index)('candidate_whatsapp_idx').on(table.whatsapp),
        whatsappNormalizedIdx: (0, mysql_core_1.index)('candidate_whatsapp_normalized_idx').on(table.whatsappNormalized),
    };
});
exports.candidateConsent = (0, mysql_core_1.mysqlTable)('CandidateConsent', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    candidateId: (0, mysql_core_1.varchar)('candidateId', { length: 191 }).notNull(),
    conversationId: (0, mysql_core_1.varchar)('conversationId', { length: 191 }),
    privacyPolicyVersion: (0, mysql_core_1.varchar)('privacyPolicyVersion', { length: 50 }).notNull().default('1.0'),
    consentType: (0, mysql_core_1.varchar)('consentType', { length: 100 }).notNull().default('CANDIDATE_PROFILE_AND_CV'),
    accepted: (0, mysql_core_1.boolean)('accepted').notNull().default(true),
    acceptedAt: createdAtTimestamp('acceptedAt'),
    source: (0, mysql_core_1.varchar)('source', { length: 50 }).notNull().default('AI_CHAT'),
}, (table) => {
    return {
        candidateConsentIdx: (0, mysql_core_1.index)('candidate_consent_candidate_idx').on(table.candidateId),
    };
});
exports.jobApplication = (0, mysql_core_1.mysqlTable)('JobApplication', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    candidateId: (0, mysql_core_1.varchar)('candidateId', { length: 191 }).notNull(),
    jobId: (0, mysql_core_1.varchar)('jobId', { length: 191 }).notNull(),
    applicationStatus: (0, mysql_core_1.varchar)('applicationStatus', { length: 191 }).notNull().default('SUBMITTED'), // SUBMITTED, REVIEWING, SHORTLISTED, REJECTED
    source: (0, mysql_core_1.varchar)('source', { length: 191 }).notNull().default('AI_CHAT'),
    conversationId: (0, mysql_core_1.varchar)('conversationId', { length: 191 }),
    appliedAt: createdAtTimestamp('appliedAt'),
}, (table) => {
    return {
        candidateIdIdx: (0, mysql_core_1.index)('job_application_candidate_id_idx').on(table.candidateId),
        jobIdIdx: (0, mysql_core_1.index)('job_application_job_id_idx').on(table.jobId),
        candidateJobUnique: (0, mysql_core_1.uniqueIndex)('job_application_candidate_job_unique').on(table.candidateId, table.jobId),
    };
});
exports.employer = (0, mysql_core_1.mysqlTable)('Employer', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    email: (0, mysql_core_1.varchar)('email', { length: 191 }).notNull().unique(),
    name: (0, mysql_core_1.varchar)('name', { length: 191 }),
    dateOfBirth: utcDateTime('dateOfBirth').notNull(),
    parentalConsent: (0, mysql_core_1.boolean)('parentalConsent').notNull().default(false),
    createdAt: createdAtTimestamp('createdAt'),
    updatedAt: updatedAtTimestamp('updatedAt'),
}, (table) => {
    return {
        emailIdx: (0, mysql_core_1.index)('employer_email_idx').on(table.email),
    };
});
exports.permission = (0, mysql_core_1.mysqlTable)('Permission', {
    id: (0, mysql_core_1.varchar)('id', { length: 191 }).primaryKey().$defaultFn(() => crypto_1.default.randomUUID()),
    name: (0, mysql_core_1.varchar)('name', { length: 191 }).notNull().unique(),
    description: (0, mysql_core_1.varchar)('description', { length: 191 }),
});
exports.userPermission = (0, mysql_core_1.mysqlTable)('UserPermission', {
    userId: (0, mysql_core_1.varchar)('userId', { length: 191 }).notNull(),
    permissionId: (0, mysql_core_1.varchar)('permissionId', { length: 191 }).notNull(),
}, (table) => {
    return {
        pk: (0, mysql_core_1.primaryKey)({ columns: [table.userId, table.permissionId] }),
        userIdIdx: (0, mysql_core_1.index)('user_permission_user_id_idx').on(table.userId),
    };
});
exports.passwordResetToken = (0, mysql_core_1.mysqlTable)('PasswordResetToken', {
    token: (0, mysql_core_1.varchar)('token', { length: 191 }).primaryKey(),
    email: (0, mysql_core_1.varchar)('email', { length: 191 }).notNull(),
    expires: utcDateTime('expires').notNull(),
    createdAt: createdAtTimestamp('createdAt'),
});
// Relations
exports.conversationRelations = (0, drizzle_orm_1.relations)(exports.conversation, ({ many }) => ({
    messages: many(exports.message),
}));
exports.messageRelations = (0, drizzle_orm_1.relations)(exports.message, ({ one }) => ({
    conversation: one(exports.conversation, {
        fields: [exports.message.conversationId],
        references: [exports.conversation.id],
    }),
}));
exports.adminUserRelations = (0, drizzle_orm_1.relations)(exports.adminUser, ({ many }) => ({
    permissions: many(exports.userPermission),
}));
exports.permissionRelations = (0, drizzle_orm_1.relations)(exports.permission, ({ many }) => ({
    userPermissions: many(exports.userPermission),
}));
exports.userPermissionRelations = (0, drizzle_orm_1.relations)(exports.userPermission, ({ one }) => ({
    user: one(exports.adminUser, {
        fields: [exports.userPermission.userId],
        references: [exports.adminUser.id],
    }),
    permission: one(exports.permission, {
        fields: [exports.userPermission.permissionId],
        references: [exports.permission.id],
    }),
}));
