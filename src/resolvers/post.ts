import { Post } from "src/entities/Post";
import { MyContext } from "src/types";
import { Ctx, Query, Resolver } from "type-graphql";

@Resolver()
export class PostResolver {
    @Query(() => [Post])
    posts(@Ctx() ctx: MyContext): Promise<Post[]> {
        return ctx.em.find(Post, {});
    }
};