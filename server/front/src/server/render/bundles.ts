import { readFileSync } from 'fs';
import { settings } from '../../lib/settings';

// <script src="https://unpkg.com/react@15/dist/react.min.js"></script>
// <script src= "https://unpkg.com/react-dom@15/dist/react-dom.min.js"></script>

//<script type="text/javascript" charset="utf-8" src="/public/${vendor['vendor.js']}"></script>

//    const vendor = JSON.parse(readFileSync(`${process.cwd()}/public/vendor.json`, 'utf8'));

export function scriptBundles() {
  if (settings.env.production) {
    const bundle = JSON.parse(readFileSync(`${process.cwd()}/front/bundle.json`, 'utf8'));
    return `
<script type="text/javascript" charset= "utf-8" src= "/front/${bundle['bundle.js']}"></script>
`;
  } else {
    return '<script type="text/javascript" charset="utf-8" src="/front/bundle.js"></script>';
  }
};

export function createTrackingScript() {
  return settings.google.analytics.account ?
    createAnalyticsSnippet(settings.google.analytics.account) :
    '';
};

export function createAnalyticsSnippet(id: string) {
  return `
<script>
window.ga=window.ga || function () { (ga.q = ga.q || []).push(arguments) }; ga.l = +new Date;
ga('create', '${id}', 'auto');
ga('send', 'pageview');
</script>
<script async src='https://www.google-analytics.com/analytics.js'></script>
`;
}