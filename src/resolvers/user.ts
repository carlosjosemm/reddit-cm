import { User } from "../entities/User";
import { MyContext } from "../types";
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from 'argon2'; 
import { cookiename } from "../constants";
// import {EntityManager} from '@mikro-orm/postgresql';

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
    //MYSELF QUERY RESOLVER
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

    //REGISTER RESOLVER
    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() ctx: MyContext
    ): Promise<UserResponse> {
        if (options.username.length <=2) {
            return {
                errors: [{
                    field: 'username',
                    message: 'Username must have more than 2 characters'
                }]
            }
        };

        if (options.password.length <= 3) {
            return {
                errors: [{
                    field: 'password',
                    message: 'Password must be at least 4 characters long'
                }]
            }
        };

        const existingtUser = await ctx.em.findOne(User, {username: options.username});
        if (existingtUser) {
            return {
                errors: [{
                    field: 'username',
                    message: 'User already registered'
                }]
            }
        };

        const hiddenPassword = await argon2.hash(options.password);
        const user = ctx.em.create(User, {username: options.username, password: hiddenPassword,});
        
        try {
            //In case the persist and flush from mikro-orm below fails, use the manual query builder:
            // const result = await (ctx.em as EntityManager).createQueryBuilder(User).getKnexQuery().insert({
            //     username: options.username, 
            //     password: hiddenPassword,
            //     create_at: new Date(), //Use underscore bc next doesnt know columns actual name as mikro-orm does
            //     updated_at: new Date(), 
            // }).returning("*");
            // user = result; //DECLARE LET = USER; BEFORE THE TRY ABOVE TO AVOID ERROR
            
            await ctx.em.persistAndFlush(user);
        } catch (err) {
            if (err.code) {
                return {
                errors: [{
                    field: 'username',
                    message: 'Sorry, something went wrong!'
                }]
            }}
        };

        //setting the session and cookie for automatic login post-resgister...

        ctx.req.session.userID = user.id;

        console.log('ctx.req.session.userID: ', ctx.req.session.userID);
        console.log('user: ', user);
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
                    message: 'User not registered'
                }],
            };
        }
        //comparing the pass from the db with the pass from the input (boolean)
        const passwordCheck = await argon2.verify(user.password, options.password);
        if (!passwordCheck) {
            return {
                errors: [{
                    field: 'password',
                    message: 'Incorrect user/password'
                }],
            };
        }

        //setting the user id for the active session and respective cookie...
        ctx.req.session.userID = user.id;

        console.log('ctx.req.session.userID: ', ctx.req.session.userID);
        console.log('user: ', user);

        return {user};
    }

    @Mutation(() => Boolean)
    logout(
        @Ctx() {req, res}: MyContext
    ) {
        return new Promise(
            (resolve) => req.session.destroy(err => {
                res.clearCookie(cookiename); //clears cookie client-side even if Redis-destroy-session fails
                if (err) {
                    console.log(err);
                    resolve(false);
                    return;
                }
                resolve(true);
            })
        );
    }
};