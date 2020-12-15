import { MikroORM } from "@mikro-orm/core";
import path from "path";
import { _prod } from "./constants";
import { Post } from "./entities/Post";

export default {
    migrations: {
        path: path.join(__dirname, "./migrations"), // path to the folder with migrations
        pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration files
    },
    dbName: "redditdb",
    entities: [Post],
    type: "postgresql",
    debug: !_prod,
} as Parameters<typeof MikroORM.init>[0];