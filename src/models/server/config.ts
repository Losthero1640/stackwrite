import env from "../../app/env";
import {
  Avatars,
  Storage,
  Databases,
  Users,
  Client,
} from "node-appwrite";


let client = new Client();

client
  .setEndpoint(env.appwrite.endpoint)
  .setProject(env.appwrite.projectId)
  .setKey(env.appwrite.apiKey)
  

  const users = new Users(client);;
  const databases = new Databases(client);
  const storage = new Storage(client);
  const avatars = new Avatars(client);
  // const tablesDB = new TablesDB(client);

export { users, databases, storage, avatars };
  