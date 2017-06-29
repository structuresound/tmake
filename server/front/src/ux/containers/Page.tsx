import * as React from 'react';
import * as Helmet from 'react-helmet';

// LINK GLOBAL ASSETS

function metaAssets(settings: Settings) {
    return [
        { charset: 'utf-8' },
        // Meta descriptions are commonly used on search engine result pages to
        // display preview snippets for a given page.
        { name: 'description', content: 'TMake is a decentralized financial market built for community investing' },
        // Setting IE=edge tells Internet Explorer to use the latest engine to
        //  render the page and execute Javascript
        { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
        // Using the viewport tag allows you to control the width and scaling of
        // the browser's viewport:
        // - include width=device-width to match the screen's width in
        // device-independent pixels
        // - include initial-scale=1 to establish 1:1 relationship between css pixels
        // and device-independent pixels
        // - ensure your page is accessible by not disabling user scaling.
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // Disable tap highlight on IE
        { name: 'msapplication-tap-highlight', content: 'no' },
        // Add to homescreen for Chrome on Android
        { name: 'mobile-web-app-capable', content: 'yes' },
        // Add to homescreen for Safari on IOS
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
        { name: 'apple-mobile-web-app-title', content: 'reactGo' },
        // Tile icon for Win8 (144x144 + tile color)
        { name: 'msapplication-TileImage', content: settings.manifest.theme['icon_120.png'] },
        { name: 'msapplication-TileColor', content: '#3372DF' }
    ];
};

function linkAssets(settings: Settings) {
    const links = [
        // Add to homescreen for Chrome on Android
        { rel: 'icon', href: settings.manifest.theme['favicon.ico'] },
        { rel: 'icon', sizes: '192x192', href: settings.manifest.theme['icon_120.png'] },
        // Add to homescreen for Safari on IOS
        { rel: 'apple-touch-icon', sizes: '152x152', href: settings.manifest.theme['icon_120.png'] },
        // { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css?family=Roboto+Condensed', type: 'text/css' },
        { rel: 'stylesheet', href: settings.manifest.theme[settings.manifest.active.theme + '.css'] },
        // SEO: If your mobile URL is different from the desktop URL,
        // add a canonical link to the desktop page https://developers.google.com/webmasters/smartphone-sites/feature-phones
        { 'rel': 'canonical', 'href': settings.env.absoluteUrl }
    ];
    if (settings.manifest.bundle) {
        links.push({ rel: 'stylesheet', href: settings.manifest.bundle['bundle.css'] })
    }
    return settings.env.production ? links : links.filter(l => l.rel !== 'stylesheet');
};

export function createPage(settings: Settings) {
    const meta = metaAssets(settings);
    const link = linkAssets(settings);
    const {title} = settings.i18n;

    return function Page(props: any) {
        const { children } = props;
        return (
            <div>
                <Helmet title={title} link={link} meta={meta} />
                {props.children}
            </div>
        );
    }
}