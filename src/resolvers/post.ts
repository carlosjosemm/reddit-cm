import { Post } from "../entities/Post";
// import { MyContext } from "../types";
import { Arg, /*Ctx,*/ Int, Mutation, Query, Resolver } from "type-graphql";

@Resolver()
export class PostResolver {
    @Query(() => [Post])
    async posts(): Promise<Post[]> {
        // await sleep(3);
        return Post.find();
    }

    @Query(() => Post, {nullable: true})
    post(
        @Arg('id', () => Int) id: number,
        ): Promise<Post | undefined> {
        return Post.findOne(id);
    }

    @Mutation(() => Post)
    async createPost(
        @Arg("title", () => String) title: string,
        // @Ctx() ctx: MyContext
        ): Promise<Post> {
            // const newpost = ctx.em.create(Post, {title})
            // await ctx.em.persistAndFlush(newpost)
        return Post.create({title}).save();
    }

    @Mutation(() => Post, {nullable:true})
    async updatePost(
        @Arg("id") id: number,
        @Arg("title", () => String, {nullable:true}) title: string,
        // @Ctx() ctx: MyContext
        ): Promise<Post | undefined> {
            // const post = await ctx.em.findOne(Post, {id});
            const post = await Post.findOne(id);

            if (!post) {
                return undefined;
            }
            if (typeof title !== 'undefined') {
                // post.title = title;
                // await ctx.em.persistAndFlush(post);
                await Post.update({id},{title});
            }
            const newpost = Post.findOne(id);
             return newpost;
    }

    @Mutation(() => Boolean)
    async detelePost(
        @Arg("id") id: number,
        // @Ctx() ctx: MyContext
        ): Promise<Boolean> {
        //    try { await ctx.em.nativeDelete(Post, {id} )}
        //    catch{}
           try { await Post.delete(id)}
           catch(err){return false;}
            return true;
    }
};