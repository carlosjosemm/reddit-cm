import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput"

export const validateRegistration = (options: UsernamePasswordInput) => {
    if (options.username.length <=2) {
        return {
            errors: [{
                field: 'username',
                message: 'Username must have more than 2 characters'
            }]
        }
    };

    if (options.username.includes('@')) {
        return {
            errors: [{
                field: 'username',
                message: "Username cannot contain '@'"
            }]
        }
    };

    if (!options.email.includes('@')) {
        return {
            errors: [{
                field: 'email',
                message: 'You must enter a valid e-mail address'
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

    return null;
}