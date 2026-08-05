import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createDirectus,
  rest,
  staticToken,
  createCollection,
  createField,
  createRelation,
  createPolicy,
  createPermission,
  createRole,
  readCollections,
  readFieldsByCollection,
  readRelations,
  readPolicies,
  readPermissions,
  readRoles,
  updatePolicy,
} from "@directus/sdk";

// Directus 11 has no "Public" role — unauthenticated requests are instead
// granted permissions via this single reserved, always-present policy.
// Directus stores its display name as a translation key rather than the
// literal string "Public".
const PUBLIC_POLICY_NAME = "$t:public_label";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.EXPO_PUBLIC_DIRECTUS_URL;
const token = process.env.DIRECTUS_ADMIN_TOKEN;

if (!url) throw new Error("EXPO_PUBLIC_DIRECTUS_URL is not set");
if (!token) throw new Error("DIRECTUS_ADMIN_TOKEN is not set");

const spec = JSON.parse(
  readFileSync(path.join(__dirname, "collections.json"), "utf-8"),
);

const directus = createDirectus(url).with(staticToken(token)).with(rest());

async function ensureRoles(roleSpecs) {
  const existingRoles = await directus.request(readRoles());
  const roleByName = new Map(existingRoles.map((r) => [r.name, r]));

  for (const roleSpec of roleSpecs ?? []) {
    if (roleByName.has(roleSpec.name)) continue;
    console.log(`Creating role "${roleSpec.name}"...`);
    const created = await directus.request(
      createRole({ name: roleSpec.name, description: roleSpec.note }),
    );
    roleByName.set(roleSpec.name, created);
  }

  return roleByName;
}

async function ensureUserFields(userFieldsSpec) {
  if (!userFieldsSpec) return;

  const existingFields = await directus.request(readFieldsByCollection("directus_users"));
  const existingFieldNames = new Set(existingFields.map((f) => f.field));

  for (const field of userFieldsSpec.fields) {
    if (existingFieldNames.has(field.field)) continue;
    console.log(`  Creating field "directus_users.${field.field}"...`);
    await directus.request(
      createField("directus_users", {
        field: field.field,
        type: field.type,
        meta: field.meta,
        schema: field.schema,
      }),
    );
  }
}

async function ensureCollection(collectionSpec) {
  const existing = await directus.request(readCollections());
  const exists = existing.some((c) => c.collection === collectionSpec.collection);

  if (!exists) {
    console.log(`Creating collection "${collectionSpec.collection}"...`);
    await directus.request(
      createCollection({
        collection: collectionSpec.collection,
        meta: collectionSpec.meta,
        schema: collectionSpec.schema,
        fields: collectionSpec.fields,
      }),
    );
    return;
  }

  console.log(`Collection "${collectionSpec.collection}" already exists, checking fields...`);
  const existingFields = await directus.request(
    readFieldsByCollection(collectionSpec.collection),
  );
  const existingFieldNames = new Set(existingFields.map((f) => f.field));

  for (const field of collectionSpec.fields) {
    if (existingFieldNames.has(field.field)) continue;
    console.log(`  Creating field "${collectionSpec.collection}.${field.field}"...`);
    await directus.request(
      createField(collectionSpec.collection, {
        field: field.field,
        type: field.type,
        meta: field.meta,
        schema: field.schema,
      }),
    );
  }
}

async function ensureRelations(collectionSpec) {
  const existingRelations = await directus.request(readRelations());

  for (const relation of collectionSpec.relations ?? []) {
    const alreadyExists = existingRelations.some(
      (r) => r.collection === collectionSpec.collection && r.field === relation.field,
    );
    if (alreadyExists) continue;

    console.log(
      `  Creating relation "${collectionSpec.collection}.${relation.field} -> ${relation.related_collection}"...`,
    );
    await directus.request(
      createRelation({
        collection: collectionSpec.collection,
        field: relation.field,
        related_collection: relation.related_collection,
        meta: relation.meta,
        schema: relation.schema,
      }),
    );
  }
}

async function ensurePublicPermissions(collectionSpec, policySpec, existingPolicies) {
  const publicPolicy = existingPolicies.find((p) => p.name === PUBLIC_POLICY_NAME);
  if (!publicPolicy) {
    console.warn(
      `  Could not find the built-in Public policy (expected name "${PUBLIC_POLICY_NAME}"). Grant public access to "${collectionSpec.collection}" manually in Settings > Access Policies > Public.`,
    );
    return;
  }

  const existingPermissions = await directus.request(
    readPermissions({
      filter: {
        policy: { _eq: publicPolicy.id },
        collection: { _eq: collectionSpec.collection },
      },
    }),
  );
  const existingActions = new Set(existingPermissions.map((p) => p.action));

  for (const perm of policySpec.permissions) {
    if (existingActions.has(perm.action)) continue;
    console.log(
      `  Granting public "${perm.action}" on "${collectionSpec.collection}" (via policy "${policySpec.name}")...`,
    );
    await directus.request(
      createPermission({
        policy: publicPolicy.id,
        collection: collectionSpec.collection,
        action: perm.action,
        fields: perm.fields ?? null,
        permissions: perm.permissions ?? null,
      }),
    );
  }
}

async function ensurePolicies(collectionSpec, roleByName) {
  const existingPolicies = await directus.request(readPolicies());

  for (const policySpec of collectionSpec.policies ?? []) {
    let policy = existingPolicies.find((p) => p.name === policySpec.name);

    if (!policy) {
      console.log(`  Creating policy "${policySpec.name}"...`);
      policy = await directus.request(
        createPolicy({ name: policySpec.name, description: policySpec.note }),
      );

      for (const perm of policySpec.permissions) {
        await directus.request(
          createPermission({
            policy: policy.id,
            collection: collectionSpec.collection,
            action: perm.action,
            fields: perm.fields ?? null,
            permissions: perm.permissions ?? null,
          }),
        );
      }
    } else {
      console.log(`  Policy "${policySpec.name}" already exists, skipping permission setup.`);
    }

    // Re-fetch with the current role attachments so we only create the
    // directus_access junction rows that are actually missing — this field
    // is a M2M alias onto directus_access, not a plain array, so PATCHing
    // it with a flat list of role IDs 403s even for full admins; it needs
    // the junction's nested create/update/delete payload shape instead.
    const [policyWithRoles] = await directus.request(
      readPolicies({
        filter: { id: { _eq: policy.id } },
        fields: ["id", "roles.role"],
      }),
    );
    const alreadyAttachedRoleIds = new Set(
      (policyWithRoles?.roles ?? []).map((r) => r.role),
    );

    const roleIdsToAttach = [];
    const attachedNames = [];
    const missingRoleNames = [];

    for (const roleName of policySpec.attachToRoles ?? []) {
      if (roleName === "Public") {
        await ensurePublicPermissions(collectionSpec, policySpec, existingPolicies);
        continue;
      }
      const role = roleByName.get(roleName);
      if (!role) {
        missingRoleNames.push(roleName);
      } else if (!alreadyAttachedRoleIds.has(role.id)) {
        roleIdsToAttach.push(role.id);
        attachedNames.push(roleName);
      }
    }

    if (roleIdsToAttach.length > 0) {
      await directus.request(
        updatePolicy(policy.id, {
          roles: { create: roleIdsToAttach.map((id) => ({ role: { id } })), update: [], delete: [] },
        }),
      );
      console.log(`  Attached "${policySpec.name}" to role(s): ${attachedNames.join(", ")}.`);
    }

    if (missingRoleNames.length > 0) {
      console.warn(
        `  Could not find role(s) [${missingRoleNames.join(", ")}] automatically. Attach policy "${policySpec.name}" to them manually in Settings > Access Policies.`,
      );
    }
  }
}

const roleByName = await ensureRoles(spec.roles);

if (spec.directusUsers) {
  console.log("Checking directus_users custom fields...");
  await ensureUserFields(spec.directusUsers);
  await ensurePolicies(
    { collection: "directus_users", policies: spec.directusUsers.policies },
    roleByName,
  );
}

for (const collectionSpec of spec.collections) {
  await ensureCollection(collectionSpec);
  await ensureRelations(collectionSpec);
  await ensurePolicies(collectionSpec, roleByName);
}

console.log("\nDone. Review Settings > Data Model and Settings > Access Policies to confirm everything looks right.");
console.log(
  'Next: create one Directus user with the "Chat Service" role, generate a static token for it, and put that token in the Next.js app\'s server env (never in the mobile app).',
);
