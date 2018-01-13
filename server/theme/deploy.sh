/usr/local/bin/aws ecr get-login | sh
version=$1
if [ $version ]
then
  echo "build image theme:${version}"
docker tag chroma/theme 738600938019.dkr.ecr.us-east-1.amazonaws.com/chroma/theme:${version}
docker push 738600938019.dkr.ecr.us-east-1.amazonaws.com/chroma/theme:${version}
fi
deployment=$2
if [ $deployment ]
then
  echo "rollout to ${deployment}"
  kubectl --namespace=default set image deployment $deployment theme=738600938019.dkr.ecr.us-east-1.amazonaws.com/chroma/theme:${version}
fi
