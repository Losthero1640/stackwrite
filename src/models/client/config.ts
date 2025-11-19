import { Client, Account, Avatars, Databases, Storage } from "appwrite";
import env from "../../app/env";

export const client = new Client()
  .setEndpoint(env.appwrite.endpoint)
  .setProject(env.appwrite.projectId)

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const avatars = new Avatars(client);

// const result = await account.create({
//   userId: "<USER_ID>",
//   email: "email@example.com",
//   password: "",
//   name: "<NAME>", // optional
// });

// console.log(result);

export { account, databases, storage, avatars };
