os = require('os')
sh = require('shelljs')
path = require('path')
fs = require('fs-extended')
yaml = require('js-yaml')
_ = require('typed-json-transform')

services = {
  front: require('./docker/front/build')
  theme: require('./docker/theme/build')
  mailer: require('./docker/mailer/build')
  rabbitmq: require('./docker/rabbitmq/build')
}

# region = process.env.REGION || 'us-west-2'
# ecr = "738600938019.dkr.ecr.#{region}.amazonaws.com"
ecr = "devops.chroma.fund"

docker =
  hub: {}
  aws: {}

_.each services, (service, key) ->
  docker.hub[key] = "tmake/#{key}:#{service.version}"
  docker.aws[key] = "#{ecr}/tmake/#{key}:#{service.version}"

urls = (namespace) ->
  switch namespace
    when 'www' then 'chroma.fund'
    when 'impactu' then 'impactu.fund'
    when 'aucanna' then 'aucanna.fund'
    else "#{namespace}.chroma.fund"

hosts = (namespace) ->
  switch namespace
    when 'www' then ['www.chroma.fund', 'chroma.fund']
    when 'impactu' then ['www.impactu.fund', 'impactu.fund']
    when 'aucanna' then ['www.aucanna.fund', 'aucanna.fund']
    else ["#{namespace}.chroma.fund"]

String::replaceAll = (search, replacement) ->
  target = this
  target.split(search).join replacement

replaceWithSecrets = (txt, secrets) ->
  _.each secrets, (section, sectionKey) ->
    _.each section, (setting, settingKey) ->
      txt = txt.replaceAll("$#{sectionKey}_#{settingKey}".toUpperCase(), setting)
  return txt

writeTls = (namespace, keysPath) ->
  try
    data =
      'tls.crt': fs.readFileSync "#{keysPath}/fullchain.pem", 'base64'
      'tls.key': fs.readFileSync "#{keysPath}/privkey.pem", 'base64'
    secret =
      apiVersion: 'v1'
      kind: 'Secret'
      metadata: name: 'tls'
      type: 'Opaque'
      data: data
    # secret = _.map(settings, (v,k) -> '#{k}=\'#{v}\'')
    fs.writeFileSync "private/dist/#{namespace}/tls-secret.json", JSON.stringify(secret, 0, 2), 'utf8'
  catch e
    console.log('no ssl credentials for', namespace)

writeNginx = (namespace, service) ->
    data =
      'nginx.conf': fs.readFileSync("templates/secrets/#{service}.conf", 'base64').replaceAll('GRUNT_NAMESPACE', namespace)
    secret =
      apiVersion: 'v1'
      kind: 'Secret'
      metadata: name: "#{service}"
      type: 'Opaque'
      data: data
    # secret = _.map(settings, (v,k) -> '#{k}=\'#{v}\'')
    fs.writeFileSync "private/dist/#{namespace}/#{service}-secret.json", JSON.stringify(secret, 0, 2), 'utf8'

writeConsul = (env, namespace, url, nuke) ->
  keysPath = "private/src/consul/#{namespace}"
  if nuke || (!fs.existsSync(keysPath))
    sh.mkdir('-p', keysPath);
    consul_gen = fs.readFileSync "templates/secrets/consul.sh", 'utf8'
    consul_gen = consul_gen.replaceAll('GRUNT_URL', url)
    consul_gen = consul_gen.replaceAll('GRUNT_NAMESPACE', namespace)
    fs.writeFileSync "#{keysPath}/certs.sh", consul_gen, 'utf8'
    sh.exec("cd #{keysPath} && sh certs.sh #{namespace}");
  masterToken = fs.readFileSync("#{keysPath}/acl-agent-master-token", 'utf8').replace(/(\r\n|\n|\r)/gm,"");
  data =
    acl_master_token: masterToken
  consulConfig =
    ca_file: "/etc/tls/ca.pem"
    cert_file: "/etc/tls/consul.pem"
    key_file: "/etc/tls/consul-key.pem"
    verify_incoming: true
    verify_outgoing: true
    verify_server_hostname: true
    acl_datacenter: namespace
    acl_default_policy: "deny"
    acl_down_policy: "deny"
    acl_master_token: masterToken
    acl_agent_master_token: masterToken
    acl_agent_token: masterToken
    ports:
      "https": 8443
  data["server.json"] = JSON.stringify(consulConfig)
  fs.readdirSync(keysPath).forEach (v) ->
    fp = "#{keysPath}/#{v}"
    if (v.indexOf('.crt') != -1) or (v.indexOf('.key') != -1) or (v.indexOf('.pem') != -1) then data[v] = fs.readFileSync(fp, 'utf8')
  ['gossip-encryption-key'].forEach (v) ->
    data[v] = fs.readFileSync("#{keysPath}/#{v}", 'utf8')
  _.each data, (v, k) -> data[k] = new Buffer(v).toString('base64')
  secret =
    apiVersion: 'v1'
    kind: 'Secret'
    metadata: name: 'consul'
    type: 'Opaque'
    data: data
  fs.writeFileSync "private/dist/#{namespace}/consul-secret.json", JSON.stringify(secret, 0, 2), 'utf8'
  writeServiceSecret 'vault', namespace, [
    ["VAULT_CONSUL_KEY", masterToken]
    ["GRUNT_NAMESPACE", namespace]
    ["GRUNT_URL", url]
  ]

writeMongo = (env, namespace, url, nuke) ->
  keysPath = "private/src/mongo/#{namespace}"
  if nuke || (!fs.existsSync(keysPath))
    sh.mkdir('-p', keysPath);
    mongo_gen = fs.readFileSync "templates/secrets/mongo.sh", 'utf8'
    mongo_gen = mongo_gen.replaceAll('GRUNT_URL', url)
    fs.writeFileSync "#{keysPath}/certs.sh", mongo_gen, 'utf8'
    sh.exec("cd #{keysPath} && sh certs.sh #{namespace}");
  data = {}
  certsFolder = "#{keysPath}/tls"
  fs.readdirSync(certsFolder).forEach (v) ->
    fp = "#{certsFolder}/#{v}"
    if (v.indexOf('.pem') != -1) && (v.indexOf('mongo') != -1) then data[v] = fs.readFileSync(fp, 'base64')
  data['root-ca.pem'] = fs.readFileSync("#{keysPath}/tls/root-ca.pem", 'base64')
  data['setup_rs.js'] = fs.readFileSync("#{keysPath}/setup_rs.js", 'base64')
  data['setup_auth.js'] = fs.readFileSync("#{keysPath}/setup_auth.js", 'base64')
  data['setup.sh'] = fs.readFileSync("#{keysPath}/setup.sh", 'base64')
  data['run.sh'] = fs.readFileSync("#{keysPath}/run.sh", 'base64')
  secret =
    apiVersion: 'v1'
    kind: 'Secret'
    metadata: name: 'mongo'
    type: 'Opaque'
    data: data
  fs.writeFileSync "private/dist/#{namespace}/mongo-secret.json", JSON.stringify(secret, 0, 2), 'utf8'

writeServiceTlsSecret = (service, namespace) ->
  keysPath = "private/src/cluster/#{namespace}/tls/#{service}"
  unless fs.existsSync keysPath
    return
  data = {}
  fs.readdirSync(keysPath).forEach (v) ->
    fp = "#{keysPath}/#{v}"
    data[v] = fs.readFileSync(fp, 'base64')
  secret =
    apiVersion: 'v1'
    kind: 'Secret'
    metadata: name: "#{service}-tls"
    type: 'Opaque'
    data: data
  fs.writeFileSync "private/dist/#{namespace}/#{service}-tls-secret.json", JSON.stringify(secret, 0, 2), 'utf8'
  console.log "+ #{service}-tls-secret"

writeServiceSecret = (service, namespace, repl) ->
  return if fs.existsSync "private/dist/#{namespace}/#{service}-secret.json"
  secretFile = ""
  try
    secretFile = fs.readFileSync("private/src/#{service}/#{namespace}.yaml", 'utf8')
  catch e
    try
      secretFile = fs.readFileSync("private/src/#{service}/default.yaml", 'utf8')
    catch e
      return
  repl.forEach (entry) ->
    secretFile = secretFile.replaceAll entry[0], entry[1]
  data = yaml.load(secretFile)
  _.each data, (v, k) ->
    if _.check(v, String)
      data[k] = new Buffer(v).toString('base64')
    else
      data[k] = new Buffer(JSON.stringify(v)).toString('base64')
  secret =
    apiVersion: 'v1'
    kind: 'Secret'
    metadata: name: service
    type: 'Opaque'
    data: data
  fs.writeFileSync "private/dist/#{namespace}/#{service}-secret.json", JSON.stringify(secret, 0, 2), 'utf8'
  console.log "+ #{service}-secret"

renderYamlTemplate = (kubeObject, namespace, template, repl) ->
  srcPath = "templates/#{kubeObject}/#{template}.yaml"
  data = {}
  try
    data = fs.readFileSync srcPath, 'utf8'
  catch
    return
  try
    repl.forEach (entry) ->
      data = data.replaceAll entry[0], entry[1]
    dstPath = "private/dist/#{namespace}/#{template}-#{kubeObject}.yaml"
    fs.writeFileSync dstPath, data, 'utf8'
    console.log "+ #{template}-#{kubeObject}"
  catch
    console.log "error creating yaml template {template}-#{kubeObject}"
  
copyYamlTemplate = (kubeObject, namespace, fileName) ->
  try
    fs.copyFileSync "templates/#{kubeObject}/#{fileName}.yaml", "private/dist/#{namespace}/#{fileName}-#{kubeObject}.yaml"
  catch

writeIngress = (namespace, url, names) ->
  getIngressTemplate = (namespace) ->
    switch namespace
      when 'www', 'impactu' then 'nakedDomain'
      else namespace
  try
    template = yaml.load fs.readFileSync(path.join(__dirname, "templates/ingress/#{getIngressTemplate(namespace)}.yaml"), 'utf8')
  catch
    console.log('using default subdomain ingress template')
    template = yaml.load fs.readFileSync(path.join(__dirname, "templates/ingress/default.yaml"), 'utf8')
  template.spec.tls[0].hosts = hosts(namespace)
  paths = []
  _.each template.spec.rules[0].http.paths.GRUNT_REPLACE, (info, serviceName) ->
    endpoints = info.routes.replace(/ /g, '').split(',')
    _.each endpoints, (endpoint) ->
      entry =
        path: path.join '/', endpoint
        backend:
          serviceName: serviceName
          servicePort: info.port
      paths.push entry
  _.each template.spec.rules, (rule) ->
    rule.http.paths = _.clone(paths);
  content = yaml.dump(template)
  content = content.replaceAll('GRUNT_URL', url)
  fs.writeFileSync "private/dist/#{namespace}/ingress.yaml", content, 'utf8'

module.exports = (grunt) ->
  grunt.loadNpmTasks('grunt-available-tasks');
  grunt.initConfig
    availabletasks:
      tasks:
        options:
          filter: 'exclude',
          tasks: ['availabletasks', 'default', 'tasks']
  
  grunt.registerTask 'ecr-secret', 'create ecr login credentials for minikube', ->
    namespace = grunt.option('namespace') || process.env.NAMESPACE || 'minikube'
    email = 'leif@chroma.io'
    # user = 'AWS'
    secretName = 'ecr-secret'
    # out = sh.exec('aws ecr get-login', {silent: true}).stdout
    # console.log out
    # password = out.replace("docker login -u #{user} -p ", '').replace(" -e none https://#{ecr}", '').replace('\n', '')
    registryCredentials = require('./private/src/docker/registry.json');
    sh.exec("kubectl --namespace=#{namespace} delete secret #{secretName}");
    console.log("created docker secret for #{namespace} @ #{ecr}")
    cmd = "kubectl --namespace=#{namespace} create secret docker-registry #{secretName} --docker-username=#{registryCredentials.user} --docker-password=#{registryCredentials.pass} --docker-server=#{ecr} --docker-email=#{email}"
    sh.exec(cmd);

  getServices = (namespace) ->
    switch namespace
      when 'impactu' then ['wordpress', 'meteor', 'ingress-controller', 'wordpress-mysql', 'mongo', 'namespace', 'theme', 'mailer', 'rabbitmq']
      when 'aucanna' then ['meteor', 'ingress-controller', 'mongo', 'namespace', 'theme', 'mailer', 'rabbitmq']
      else ['front', 'meteor', 'ingress-controller', 'mongo', 'namespace', 'theme', 'mailer', 'rabbitmq']

  getSubdomains = (namespace) ->
    switch namespace
      when 'www', 'impactu' then ['', 'www']
      else [namespace]

  grunt.registerTask 'render', 'render templates for minikube OR production by using flag --namespace=YOUR_NAMESPACE', ->
    namespace = grunt.option('namespace') || process.env.NAMESPACE || 'minikube'
    nuke = grunt.option('nuke')
    dockerEnv = if namespace == 'minikube' then 'hub' else 'aws'
    sh.rm('-rf', "private/dist/#{namespace}")
    sh.mkdir('-p', "private/dist/#{namespace}")
    # secrets + configs
    url = urls(namespace)
    subdomains = getSubdomains(namespace)
    defaultRepl = [
      ["GRUNT_NAMESPACE", namespace]
      ["GRUNT_URL", url]
    ]
    writeIngress(namespace, url, subdomains)
    writeTls(namespace, "private/src/tls/#{url}")
    renderYamlTemplate 'config-map', namespace, 'storage', defaultRepl
    renderYamlTemplate 'config-map', namespace, 'ingress-controller-sticky', defaultRepl
    renderYamlTemplate 'public-service', namespace, 'ingress-controller', defaultRepl
    getServices(namespace).forEach (template) ->
      chromaRepl = [
        ["GRUNT_DOCKER_PREFIX"]
        ["GRUNT_#{template.toUpperCase()}_IMAGE", docker[dockerEnv][template]]
        ["GRUNT_NAMESPACE", namespace]
        ["GRUNT_URL", url]
      ]
      writeServiceSecret template, namespace, chromaRepl
      writeServiceTlsSecret template, namespace
      renderYamlTemplate 'cluster-service', namespace, template, chromaRepl
      renderYamlTemplate 'stateful-set', namespace, template, chromaRepl
      renderYamlTemplate 'deployment', namespace, template, chromaRepl
  
  grunt.registerTask 'distribute', 'build docker container for service', ->
    only = grunt.option('only')
    exclude = grunt.option('exclude')
    distribute = (namespace) ->
      packagePath = path.join(__dirname, '..', namespace, 'package.json')
      try
        pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      catch e
        return console.log('no package to build @ ', packagePath)
      code = sh.exec(pkg.scripts.distribute, {cwd: path.dirname(packagePath)}).code
      if code then process.exit code
    unless only then _.each services, (service, key) -> unless key == exclude then distribute(key)
    else
      if services[only] then distribute(only)
      else console.log('no service found for', only)

  grunt.registerTask 'docker', 'build docker container(s) for service(s) - default to all', ->
    only = grunt.option('only')
    exclude = grunt.option('exclude')
    unless only then _.each services, (service, key) -> unless key == exclude then service.build()
    else
      service = services[only]
      if service then service.build()
      else console.log('no service found for', only)

  grunt.registerTask 'build', 'both distribute + docker steps', ['distribute', 'docker']

  grunt.registerTask 'install', 'build, containerize, update versions, push, deploy', ['build', 'push', 'render','apply']

  grunt.registerTask 'push', 'push docker image to registry (hub or aws)', ->
    registry = grunt.option('registry') || 'aws'
    serviceName = grunt.option('only') || ''
    if serviceName
      namespace = grunt.option('namespace') || 'minikube'
      localTag = docker['hub'][serviceName]
      if registry == 'aws'
        productionTag = docker[registry][serviceName]
        sh.exec "docker tag #{localTag} #{productionTag}"
        sh.exec "eval $(aws ecr get-login --no-include-email) && docker push #{productionTag}"
      else
        sh.exec "docker push #{localTag}"
    else
      console.log('no service found for', serviceName)

  grunt.registerTask 'apply', 'start services on minikube or kubernetes cluster', ->
    namespace = grunt.option('namespace') || process.env.NAMESPACE || 'default'
    base = "private/dist/#{namespace}"
    service = grunt.option('only') || ''
    cmd = "kubectl --namespace=#{namespace} apply -f"
    if service
      if service == 'ingress'
        sh.exec("#{cmd} #{base}/#{service}.yaml");
      else if (service == 'mongo' or service == 'cockroachdb' or service == 'rabbitmq')
        sh.exec("#{cmd} #{base}/#{service}-cluster-service.yaml");
        sh.exec("#{cmd} #{base}/#{service}-secret.json");
        sh.exec("#{cmd} #{base}/#{service}-tls-secret.json");
        sh.exec("#{cmd} #{base}/#{service}-stateful-set.yaml");
      else
        sh.exec("#{cmd} #{base}/#{service}-cluster-service.yaml");
        sh.exec("#{cmd} #{base}/#{service}-secret.json");
        sh.exec("#{cmd} #{base}/#{service}-deployment.yaml");
    else
      secrets = []
      configMaps = []
      services = []
      jobs = []
      sets = []
      deployments = []
      _.each fs.readdirSync(base), (v) ->
        if v.indexOf('.json') != -1 then secrets.push v
        else if v.indexOf('config-map') != -1 then configMaps.push v
        else if v.indexOf('job') != -1 then jobs.push v
        else if v.indexOf('service') != -1 then services.push v
        else if v.indexOf('stateful-set') != -1 then sets.push v
        else if v.indexOf('.yaml') != -1 then deployments.push v
      secrets.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");
      configMaps.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");
      services.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");
      sets.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");
      jobs.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");
      deployments.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");

  grunt.registerTask 'configure', 'configure running services', ->
    namespace = grunt.option('namespace') || 'default'
    fs.readdirSync('config').forEach (v) -> sh.exec("NAMESPACE=#{namespace} sh config/#{v}");

  grunt.registerTask 'delete', 'start services on minikube or kubernetes cluster', ->
    namespace = grunt.option('namespace') || process.env.NAMESPACE || 'default'
    base = "private/dist/#{namespace}"
    service = grunt.option('only') || ''
    cmd = "kubectl --namespace=#{namespace} delete -f"
    if service
      if service == 'ingress'
        sh.exec("#{cmd} #{base}/#{service}.yaml");
      else if (service == 'mongo' or service == 'cockroachdb' or service == 'rabbitmq')
        sh.exec("#{cmd} #{base}/#{service}-cluster-service.yaml");
        sh.exec("#{cmd} #{base}/#{service}-secret.json");
        sh.exec("#{cmd} #{base}/#{service}-tls-secret.json");
        sh.exec("#{cmd} #{base}/#{service}-stateful-set.yaml");
      else
        sh.exec("#{cmd} #{base}/#{service}-cluster-service.yaml");
        sh.exec("#{cmd} #{base}/#{service}-secret.json");
        sh.exec("#{cmd} #{base}/#{service}-deployment.yaml");
    else
      secrets = []
      configMaps = []
      services = []
      jobs = []
      sets = []
      deployments = []
      _.each fs.readdirSync(base), (v) ->
        if v.indexOf('.json') != -1 then secrets.push v
        else if v.indexOf('config-map') != -1 then configMaps.push v
        else if v.indexOf('job') != -1 then jobs.push v
        else if v.indexOf('service') != -1 then services.push v
        else if v.indexOf('stateful-set') != -1 then sets.push v
        else if v.indexOf('.yaml') != -1 then deployments.push v
      secrets.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");
      configMaps.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");
      services.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");
      sets.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");
      jobs.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");
      deployments.forEach (file) ->
        sh.exec("#{cmd} #{base}/#{file}");


  grunt.registerTask 'kops', ->
    namespace = grunt.option('namespace') || process.env.NAMESPACE || 'default'
    console.log """
    export NAME=#{namespace}.chroma.fund
    export KOPS_STATE_STORE=s3://k8s-#{namespace}-chroma-fund
    
    then

    kops get instancegroups
    OR
    kops edit ig nodes

    then
    kops update cluster #{namespace}.chroma.fund
    kops update cluster #{namespace}.chroma.fund --yes
    """
  grunt.registerTask('tasks', ['availabletasks']);

