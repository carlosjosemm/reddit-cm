import {MikroORM} from "@mikro-orm/core";
import { _prod } from "./constants";
// import { Post } from "./entities/Post";
import mikroconfig from "./mikro-orm.config";
import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import {buildSchema} from 'type-graphql';
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import "reflect-metadata";

const main = async () => {
    const orm = await MikroORM.init(mikroconfig);
    await orm.getMigrator().up();

    const app = express();
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver],
            validate: false
        }),

        context: () => ({ em: orm.em })
    });

    apolloServer.applyMiddleware({app});
    // app.get('/', (_, res) => {
    //     res.send('hello');
    // });
    app.listen(4000, () => {
        console.log('server listening on localhost:4000')
    });

    // const post = orm.em.create(Post, {title: 'first post'});
    // orm.em.persist(post);
    // await orm.em.flush();
    // const posts = await orm.em.find(Post, {});
    // console.log(posts);
};

main().catch(err => {
    console.error(err);
});
