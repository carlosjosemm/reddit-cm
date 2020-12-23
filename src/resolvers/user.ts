import { User } from "../entities/User";
import { MyContext } from "../types";
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from 'argon2'; 
import { cookiename, recovery_prefix } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegistration } from "../utils/validateRegistration";
import { sendEmail } from "../utils/sendEmail";
import {v4} from 'uuid';
// import { getConnection } from "typeorm";
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
        const me = await User.findOne({id: ctx.req.session.userID});
        return me; //me takes 'User' entity types from the db query so it ca be returned as is.
    }
    //FORGOT PASSWORD RESOLVER--------------------------------
    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg("email") email: string,
        @Ctx() ctx: MyContext
    ) {
        const forgottenUser = await User.findOne({where: {email }});

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

        const user = await User.findOne(parseInt(userID))
        if (!user) {
            return {
                errors: [{
                    field: 'newPassword',
                    message: 'User no longer exists'
                }]
            }
        };

        user.password = await argon2.hash(newPassword);
        await User.update({id: parseInt(userID)}, {password: user.password});

        

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
        
        const ValidateError = validateRegistration(options);
        if (ValidateError) {
            return ValidateError;
        }

        const existingtUser = await User.findOne({where: {username: options.username}});
        if (existingtUser) {
            return {
                errors: [{
                    field: 'username',
                    message: 'User already registered'
                }]
            }
        };

        const existingtEmail = await User.findOne({where: {email: options.email}});
        if (existingtEmail) {
            return {
                errors: [{
                    field: 'email',
                    message: 'Email already registered'
                }]
            }
        };

        const hiddenPassword = await argon2.hash(options.password);
        const user = await User.create({username: options.username, password: hiddenPassword, email: options.email}).save();
        
        try {
            // const result = getConnection().createQueryBuilder().insert().into(User).values(
            //     {
            //         username: options.username,
            //         email: options.email,
            //         password: hiddenPassword,
            //     }
            // ).returning('*').execute();  
        } catch (err) {
            if (err.code) {
                return {
                errors: [{
                    field: 'password',
                    message: 'Sorry, something went wrong!'
                }]
            }}
        };

        //setting the session and cookie for automatic login post-register...

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
        const user = await User.findOne(usernameOrEmail.includes('@') ? {where: {email: usernameOrEmail}} : {where: {username: usernameOrEmail}});
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