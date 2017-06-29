
declare namespace TMake {
    // type EmailTemplate = 'orderStatus' | 'verifyEmail' | 'resetPassword' | 'contact';

    interface Email {
        from: string,
        to: string,
        replyTo: string
        subject: string
        html?: string
        template?: string
        generateTextFromHTML?: true
        attachments?: any
        data?: any
    }

    namespace Email {
        namespace Form {
            interface Contact {
                email: string,
                name: string,
                body: string
            }
        }

        namespace Account {
            interface VerifyEmail {
                profile: TMake.User.Profile,
                validationLink: string
            }

            interface ResetPassword {
                resetLink: string
            }
        }
    }
}