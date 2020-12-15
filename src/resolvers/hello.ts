import { Query, Resolver } from "type-graphql";

@Resolver()
export class HelloResolver {
    @Query(() => String)
    nada() {
        return "hello dude"
    }
};