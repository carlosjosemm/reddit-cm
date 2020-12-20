import { User } from "../entities/User";
import { MyContext } from "../types";
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from 'argon2'; 
import { cookiename, recovery_prefix } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegistration } from "../utils/validateRegistration";
import { sendEmail } from "../utils/sendEmail";
import {v4} from 'uuid';
// import { Post } from "src/entities/Post";
// import {EntityManager} from '@mikro-orm/postgresql';


//the class for the error to display
@ObjectType()
class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

//The class for the response of the resolvers, both fields 
// nullables so you can return just one of them if necessary.
@ObjectType()
class UserResponse {
    @Field(() => [FieldError], {nullable: true})
    errors?: FieldError[];

    @Field(() => User, {nullable: true})
    user?: User
}

// USER RESOLVER
@Resolver()
export class UserResolver {
    //MYSELF QUERY RESOLVER-----------------------------------------------------
    @Query(() => User, {nullable: true})
    async myself(
        @Ctx() ctx: MyContext
    ) {
        if (!ctx.req.session.userID) {
            return null
        }
        const me = await ctx.em.findOne(User, {id: ctx.req.session.userID});
        return me; //me takes 'User' entity types from the db query so it ca be returned as is.
    }
    //FORGOT PASSWORD RESOLVER--------------------------------
    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg("email") email: string,
        @Ctx() ctx: MyContext
    ) {
        const forgottenUser = await ctx.em.findOne(User, {email});

        if (!forgottenUser) {
            //Dont telling user that the email is not registered...
            console.log(forgottenUser);
            return false;
        };

        console.log('user: ', forgottenUser);
        const token = v4();
        console.log('token:', token);
        await ctx.redis.set(recovery_prefix + token, forgottenUser.id, 'ex', 1000*60*60*24);
        const userID = await ctx.redis.get(recovery_prefix+token);
        console.log('userID from redis: ', userID);

        await sendEmail(email, `<a href="http:/localhost:3000/recovery/${token}">Reset your password</a>`);
        return true;
    }

    //CHANGE PASSWORD RESOLVER---------------------------------
    @Mutation(() => UserResponse)
    async changePassword(
        @Arg('token') token: string,
        @Arg('newPassword') newPassword: string,
        @Ctx() ctx: MyContext
    ):Promise<UserResponse> {
        if (newPassword.length <= 3) {
            return {
                errors: [{
                    field: 'newPassword',
                    message: 'Password must be at least 4 characters long'
                }]
            };
        };
        const userID = await ctx.redis.get(recovery_prefix+token);
        
        if (!userID) {
            return {
                errors: [{
                    field: 'newPassword',
                    message: 'Token expired'
                }]
            }
        };

        const user = await ctx.em.findOne(User, {id: parseInt(userID)})
        if (!user) {
            return {
                errors: [{
                    field: 'newPassword',
                    message: 'User no longer exists'
                }]
            }
        };

        user.password = await argon2.hash(newPassword);
        await ctx.em.persistAndFlush(user);

        

        //Optional: logs in user after changing password by setting session cookie
        ctx.req.session.userID = user.id; 
        
        //Delete token from redis
        await ctx.redis.del(recovery_prefix+token);

        return {user};
    }

    //REGISTER RESOLVER------------------------------------------------------------
    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() ctx: MyContext
    ): Promise<UserResponse> {
        // User data validation migrated to external file...
        // if (options.username.length <=2) {
        //     return {
        //         errors: [{
        //             field: 'username',
        //             message: 'Username must have more than 2 characters'
        //         }]
        //     }
        // };

        // if (options.username.includes('@')) {
        //     return {
        //         errors: [{
        //             field: 'username',
        //             message: "Username cannot contain '@'"
        //         }]
        //     }
        // };

        // if (!options.email.includes('@')) {
        //     return {
        //         errors: [{
        //             field: 'email',
        //             message: 'You must enter a valid e-mail address'
        //         }]
        //     }
        // };

        // if (options.password.length <= 3) {
        //     return {
        //         errors: [{
        //             field: 'password',
        //             message: 'Password must be at least 4 characters long'
        //         }]
        //     }
        // };

        const ValidateError = validateRegistration(options);
        if (ValidateError) {
            return ValidateError;
        }

        const existingtUser = await ctx.em.findOne(User, {username: options.username});
        if (existingtUser) {
            return {
                errors: [{
                    field: 'username',
                    message: 'User already registered'
                }]
            }
        };

        const existingtEmail = await ctx.em.findOne(User, {email: options.email});
        if (existingtEmail) {
            return {
                errors: [{
                    field: 'email',
                    message: 'Email already registered'
                }]
            }
        };

        const hiddenPassword = await argon2.hash(options.password);
        const user = ctx.em.create(User, {username: options.username, password: hiddenPassword, email: options.email});
        
        try {
            //In case the persist and flush from mikro-orm below fails, use the manual query builder:
            // const result = await (ctx.em as EntityManager).createQueryBuilder(User).getKnexQuery().insert({
            //     username: options.username, 
            //     email:options.email,
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
                    field: 'password',
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

    // LOGIN RESOLVER---------------------------------------
    @Mutation(() => UserResponse)
    async login(
        @Arg('usernameOrEmail') usernameOrEmail: string,
        @Arg('password') password: string,
        @Ctx() ctx: MyContext
    ): Promise<UserResponse> {
        const user = await ctx.em.findOne(User, usernameOrEmail.includes('@') ? {email: usernameOrEmail} : {username: usernameOrEmail});
        if (!user) {
            return {
                errors: [{
                    field: 'usernameOrEmail',
                    message: 'User not registered'
                }],
            };
        }
        //comparing the pass from the db with the pass from the input (boolean)
        const passwordCheck = await argon2.verify(user.password, password);
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