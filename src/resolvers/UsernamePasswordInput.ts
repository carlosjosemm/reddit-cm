import { Field, InputType } from "type-graphql";


//creating the class instead of putting multiple Args
@InputType()
export class UsernamePasswordInput {
    @Field()
    username: string;
    @Field()
    password: string;
    @Field()
    email: string;
}
