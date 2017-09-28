declare module "http-proxy" {
    interface ProxyServerOptions {
        target: string,
        ws: boolean
    }
    export function createProxyServer(options: ProxyServerOptions): any;
}