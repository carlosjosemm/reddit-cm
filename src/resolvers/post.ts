import { Post } from "../entities/Post";
import { MyContext } from "../types";
import { Arg, Ctx, Int, Mutation, Query, Resolver } from "type-graphql";

@Resolver()
export class PostResolver {
    @Query(() => [Post])
    async posts(@Ctx() ctx: MyContext): Promise<Post[]> {
        // await sleep(3);
        return ctx.em.find(Post, {});
    }

    @Query(() => Post, {nullable: true})
    post(
        @Arg('id', () => Int) id: number,
        @Ctx() ctx: MyContext
        ): Promise<Post | null> {
        return ctx.em.findOne(Post, {id});
    }

    @Mutation(() => Post)
    async createPost(
        @Arg("title", () => String) title: string,
        @Ctx() ctx: MyContext
        ): Promise<Post> {
            const newpost = ctx.em.create(Post, {title})
            await ctx.em.persistAndFlush(newpost)
        return newpost;
    }

    @Mutation(() => Post, {nullable:true})
    async updatePost(
        @Arg("id") id: number,
        @Arg("title", () => String, {nullable:true}) title: string,
        @Ctx() ctx: MyContext
        ): Promise<Post | null> {
            const post = await ctx.em.findOne(Post, {id});
            if (!post) {
                return null
            }
            if (typeof title !== 'undefined') {
                post.title = title;
                await ctx.em.persistAndFlush(post);
            }
            return post;
    }

    @Mutation(() => Boolean)
    async detelePost(
        @Arg("id") id: number,
        @Ctx() ctx: MyContext
        ): Promise<Boolean> {
           try { await ctx.em.nativeDelete(Post, {id} )}
           catch{}
            return true;
    }
};