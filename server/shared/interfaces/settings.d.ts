declare namespace TMake {
    namespace Settings {
        interface GoogleAnalytics {
            account: string,
            cookieName: string,
            cookieDomain: string,
            cookieExpires: string,
            debug: boolean,
            set: {
                forceSSL: boolean,
                anonymizeIp: boolean
            },
            require: {
                displayfeatures: boolean,
                linkid: string
            },
            trackUserId: boolean
        }

        interface Link {
            title: string
            href: string
        }

        interface i18n {
            name: string
            title: string
            legal: {
                entity: string;
            }
        }

        namespace AWS {
            interface Read {
                region: string,
                cdn: string,
                bucket: string
            }
            interface Write {
                region: string,
                accessKeyId: string
                secretAccessKey: string
            }
        }

        interface Theme {
            bundle?: any;
            theme?: any;
            vendor?: any;
            active?: {
                theme: string;
            }
        }

        interface Server {
            host: string
            port?: number
            https?: boolean
        }

        interface AMQP extends Server {
            username: string,
            password: string
            queues?: {
                mail: 'mail'
            }
        }

        namespace Shared {
            interface Public {
                i18n: i18n
                twitter: {
                    account: string
                }
                facebook: {
                    account: string
                    appId: string
                }
                google: {
                    clientId: string,
                    analytics: GoogleAnalytics
                }
                email: {
                    contact: string
                    support: string
                }
                links: {
                    blog?: Link
                },
                url: string
                assets: {
                    s3: AWS.Read
                }
                manifest: Theme
            }

            interface Private {
                aws: AWS.Write
                google: {
                    secret: string
                }
                facebook: {
                    secret: string
                },
                amqp: AMQP
            }
        }
    }
}