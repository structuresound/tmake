var K8s = require('k8s')

// use kubectl

var kubectl = K8s.kubectl({
    endpoint:  'http://192.168.10.10:8080'
    , namespace: 'namespace'
    , binary: '/usr/local/bin/kubectl'
})