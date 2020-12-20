import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Request, Response } from 'express';
import { Redis } from "ioredis";
// import Express from 'express-session';

//merging type for custom property on session
declare module "express-session" {
    interface Session {
      userID: number;
    }
  };

export type MyContext = {
    em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>
    req: Request //& {session: Express.Session};
    res: Response;
    redis: Redis;
};