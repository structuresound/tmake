var fs = require("fs");

const template = fs.readFileSync('devops/local/services.template.yaml', 'utf8');
const services = template.replace(/\${pwd}/g, process.cwd());

fs.writeFileSync('devops/local/services.yaml', services);
