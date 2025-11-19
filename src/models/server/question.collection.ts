// import { Permission, Role } from "node-appwrite";
// import { db, questionCollection } from "../name";
// import { databases,tablesDB } from "./config";

// export default async function createQuestionTable() {
//   try {
//     // 1) Create table (server-side, needs API key)
//     await tablesDB.createTable({
//       databaseId: db, // existing database id
//       tableId: questionCollection, // your table id
//       name: "Questions",
//       permissions: [
//         Permission.read(Role.any()),
//         Permission.create(Role.any()), // allow anyone to create (modify to your needs)
//         Permission.read(Role.users()), // example extra role usage
//       ],
//       // rowSecurity, enabled, etc. are optional
//     });
//     console.log("Question table created");
//   } catch (err: any) {
//     // handle "already exists" gracefully (Appwrite returns error code/message)
//     if (err?.message?.includes("already") || err?.code === 409) {
//       console.log("Question table already exists — continuing");
//     } else {
//       throw err;
//     }
//   }

//   // 2) Create columns (run in parallel)
//   await Promise.all([
//     tablesDB.createStringColumn({
//       databaseId: db,
//       tableId: questionCollection,
//       key: "title",
//       size: 255,
//       required: true,
//     }),
//     tablesDB.createStringColumn({
//       databaseId: db,
//       tableId: questionCollection,
//       key: "content",
//       size: 10000,
//       required: true,
//     }),
//     tablesDB.createStringColumn({
//       databaseId: db,
//       tableId: questionCollection,
//       key: "authorId",
//       size: 36,
//       required: true,
//     }),
//     tablesDB.createStringColumn({
//       databaseId: db,
//       tableId: questionCollection,
//       key: "tags",
//       size: 255,
//       required: false,
//       array: true, // if you want tags as array
//     }),
//     tablesDB.createStringColumn({
//       databaseId: db,
//       tableId: questionCollection,
//       key: "attachmentId",
//       size: 100,
//       required: false,
//     }),
//   ]);

//   console.log("Columns created");
// }

//old version

import { IndexType, Permission } from "node-appwrite";

import { db, questionCollection } from "../name";
import { databases } from "./config";

export default async function createQuestionCollection() {
  // Create the collection if it doesn't exist. Ignore 'already exists' errors.
  try {
    await databases.createCollection(
      db,
      questionCollection,
      questionCollection,
      [
        Permission.read("any"),
        Permission.read("users"),
        Permission.create("users"),
        Permission.update("users"),
        Permission.delete("users"),
      ]
    );
    console.log("Question collection created");
  } catch (err: any) {
    // Appwrite returns various error shapes — tolerate already-exists errors.
    if (
      err?.code === 409 ||
      String(err?.message).toLowerCase().includes("already")
    ) {
      console.log("Question collection already exists — continuing");
    } else {
      console.error("Error creating collection", err);
      throw err;
    }
  }

  // Create attributes idempotently (ignore already-exists errors)
  const attrs = [
    () =>
      databases.createStringAttribute(
        db,
        questionCollection,
        "title",
        100,
        true
      ),
    () =>
      databases.createStringAttribute(
        db,
        questionCollection,
        "content",
        10000,
        true
      ),
    () =>
      databases.createStringAttribute(
        db,
        questionCollection,
        "authorId",
        50,
        true
      ),
    () =>
      databases.createStringAttribute(
        db,
        questionCollection,
        "tags",
        50,
        true,
        undefined,
        true
      ),
    () =>
      databases.createStringAttribute(
        db,
        questionCollection,
        "attachmentId",
        50,
        false
      ),
  ];

  for (const createAttr of attrs) {
    try {
      await createAttr();
    } catch (err: any) {
      // If attribute already exists, continue. Otherwise rethrow.
      const msg = String(err?.message || "");
      if (
        err?.code === 409 ||
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("attribute")
      ) {
        // attribute may already exist or Appwrite may respond with attribute-specific messages
        console.log("Attribute exists or not available yet — continuing");
      } else {
        console.error("Error creating attribute", err);
        throw err;
      }
    }
  }
  console.log("Question attributes created (or already present)");

  // Helper: create index with retries if Appwrite reports attribute not available yet.
  async function createIndexWithRetry(
    key: string,
    type: any,
    attributes: string[],
    orders: string[],
    retries = 6,
    delayMs = 500
  ) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await databases.createIndex(
          db,
          questionCollection,
          key,
          type,
          attributes,
          orders
        );
        console.log(`Index '${key}' created`);
        return;
      } catch (err: any) {
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("attribute not available") && attempt < retries) {
          console.warn(
            `Index '${key}' failed due to missing attribute, retrying (${attempt}/${retries})`
          );
          await new Promise((res) => setTimeout(res, delayMs));
          continue;
        }
        // If index already exists, ignore
        if (err?.code === 409 || msg.includes("already")) {
          console.log(`Index '${key}' already exists — skipping`);
          return;
        }
        console.error(`Failed to create index '${key}'`, err);
        throw err;
      }
    }
    throw new Error(`Failed to create index '${key}' after ${retries} retries`);
  }

  // create Indexes (with retry to allow attributes to become available)
  await Promise.all([
    createIndexWithRetry("title", IndexType.Fulltext, ["title"], ["asc"]),
    createIndexWithRetry("content", IndexType.Fulltext, ["content"], ["asc"]),
  ]);
}
