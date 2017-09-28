import { s3url } from './assets';
import * as CleanCSS from 'clean-css';

const headCSS = `
body,
p {
  font-family: sans-serif;
  color: #333;
  text-align: center;
}

ul {
  list-style-type: none;
  text-align: left;
}

body {
  width: 100%;
  background-color: #fff;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  mso-margin-top-alt: 0;
  mso-margin-bottom-alt: 0;
  mso-padding-alt: 0 0 0 0;
}

img {
  max-width: 100% !important;
}

span.preheader {
  display: none;
  font-size: 1px;
}

html {
  width: 100%;
}

table {
  font-size: 14px;
  border: 0;
}

table#raw-html p,
table#raw-html ul,
table#raw-html li,
table#raw-html pre {
  text-align: left;
}

/* ----------- responsivity ----------- */
@media only screen and (max-width: 480px){
  .panel3 {
      width:84% !important;
  }
    .panel2 {
      width:86% !important;
  }
  .panel1 {
      width:88% !important;
  }
  .panel {
      width:90% !important;
  }
}
`;

export const minifiedHeadCSS = new CleanCSS().minify(headCSS).styles;

export function generateCustomTemplate(templateOptions: any) {
  return `
<!-- <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"> -->
<html>
  <head>
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
    <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0" name="viewport">
    <link href='http://fonts.googleapis.com/css?family=Questrial' rel=
    'stylesheet' type='text/css'>
    <link href='http://fonts.googleapis.com/css?family=Oxygen:400,300,700' rel=
    'stylesheet' type='text/css'>
    <style>${minifiedHeadCSS}</style>
    <title>${templateOptions.title}</title>
  </head>
  <body>
    ${templateOptions.bodyContent}
  </body>
</html>
`}