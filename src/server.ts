import {MikroORM} from "@mikro-orm/core";
import { cookiename, _prod } from "./constants";
import mikroconfig from "./mikro-orm.config";
import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import {buildSchema} from 'type-graphql';
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import "reflect-metadata";
import { UserResolver } from "./resolvers/user";
import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { MyContext } from "./types";
import cors from 'cors';
import { sendEmail } from "./utils/sendEmail";
// import { User } from "./entities/User";

// declare module "express-session" {
//     interface Session {
//       userID: number;
//     }
//   };



const main = async () => {

    sendEmail('carlosjmoncadam@gmail.com','Prueba');
    //init mikro-orm

    const orm = await MikroORM.init(mikroconfig);
    // await orm.em.nativeDelete(User, {});

    await orm.getMigrator().up();
    //init express
    const app = express();
    //init Redis
    const RedisStore = connectRedis(session);
    const redis = new Redis();

    //Setting cors...
    app.use(
        cors({
            origin: 'http://localhost:3000' ,
            credentials: true
    }));
    //Setting session...
    app.use(
        session({
            name: cookiename,
          store: new RedisStore({ client: redis,
            disableTouch: true,
            // disableTTL: true,
           }),
           cookie: {
               maxAge: 1000 * 60 * 60 * 24 * 365,
               httpOnly: true, //not accesible from frontend
               secure: _prod, //cookie only in https
               sameSite: 'lax', //csrf ??
           },
           saveUninitialized: false,
          secret: 'somerandomsecretkey',
          resave: false,
        })
      )
    //init apollo
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false
        }),
        //pass req and res from express to apollo via context so resolvers can access it
        context: ({req, res}): MyContext => ({ em: orm.em, req, res, redis}) 
    });

    apolloServer.applyMiddleware({app, cors:false}); //make cors false here to apply it elsewhere

    app.listen(4000, () => {
        console.log('server listening on localhost:4000')
    });
};

main().catch(err => {
    console.error(err);
});
