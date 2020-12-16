import { User } from "../entities/User";
import { MyContext } from "../types";
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from 'argon2'; 

//creating the class instead of putting multiple Args
@InputType()
class UsernamePasswordInput {
    @Field()
    username: string
    @Field()
    password: string
}

//the class for the error to display
@ObjectType()
class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

//the class for the response of the resolvers
@ObjectType()
class UserResponse {
    @Field(() => [FieldError], {nullable: true})
    errors?: FieldError[];

    @Field(() => User, {nullable: true})
    user?: User
}

// REGISTER RESOLVER
@Resolver()
export class UserResolver {
    @Query(() => User, {nullable: true})
    async myself(
        @Ctx() ctx: MyContext
    ) {
        if (!ctx.req.session.userID) {
            return null
        }
        const me = await ctx.em.findOne(User, {id: ctx.req.session.userID});
        return me;
    }


    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() ctx: MyContext
    ): Promise<UserResponse> {
        if (options.username.length <=2) {
            return {
                errors: [{
                    field: 'username',
                    message: 'username must have more than 2 characters'
                }]
            }
        };

        if (options.password.length <= 3) {
            return {
                errors: [{
                    field: 'password',
                    message: 'password must be at least 4 characters long'
                }]
            }
        };

        const existingtUser = await ctx.em.findOne(User, {username: options.username});
        if (existingtUser) {
            return {
                errors: [{
                    field: 'username',
                    message: 'user already registered'
                }]
            }
        };

        const hiddenPassword = await argon2.hash(options.password);
        const user = ctx.em.create(User, {username: options.username, password: hiddenPassword,});
        
        try {
        await ctx.em.persistAndFlush(user);
        } catch (err) {
            if (err.code) {
                return {
                errors: [{
                    field: 'username',
                    message: 'sorry, something went wrong!'
                }]
            }}
        };

        ctx.req.session.userID = user.id;

        return {user};
    }

    // LOGIN RESOLVER
    @Mutation(() => UserResponse)
    async login(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() ctx: MyContext
    ): Promise<UserResponse> {
        const user = await ctx.em.findOne(User, {username:options.username});
        if (!user) {
            return {
                errors: [{
                    field: 'username',
                    message: 'user not registered'
                }],
            };
        }
        //comparing the pass from the db with the pass from the input (boolean)
        const passwordCheck = await argon2.verify(user.password, options.password);
        if (!passwordCheck) {
            return {
                errors: [{
                    field: 'password',
                    message: 'incorrect user/password'
                }],
            };
        }

        ctx.req.session.userID = user.id;

        return {user};
    }
};