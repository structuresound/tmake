#!/bin/bash
kubectl --namespace=$NAMESPACE exec rabbitmq-0 -- rabbitmqctl set_policy ha-all '.*' '{"ha-mode":"all"}' --apply-to queues
