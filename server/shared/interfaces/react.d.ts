/// <reference path="./settings.d.ts" />
/// <reference path="./react-responsive.d.ts" />

declare namespace TMake {
    namespace React {
        interface PageProps {
            mq?: TMake.MediaQueryProps
            loginTokenPresent?: boolean
        }

        interface CopyProps {
            i18n?: TMake.Settings.i18n
            s3url?(rel: string): string
            manifest?: any
        }

        interface LayoutProps extends PageProps, CopyProps {
            mq?: TMake.MediaQueryProps
            fluid?: boolean,
            children?: any
        }

        interface Navbar extends LayoutProps {
            account?: any;
            loginTokenPresent?: boolean
        }

        interface NavbarLogin {
            user?: any;
        }
    }
}