declare namespace TMake {
    class User {
        email: string
        roles: string[]

        profile_s3_cropped_url(): string;
    }
    namespace User {
        interface Profile {
            firstName: string
            lastName: string
        }
    }
    namespace Action {
        interface SetUser {
            user: TMake.User
            type: 'SET_USER'
        }
    }
}