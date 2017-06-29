kops create cluster \
    --node-count 3 \
    --zones us-west-2a,us-west-2b,us-west-2c \
    --master-zones us-west-2a,us-west-2b,us-west-2c \
    --node-size m3.medium \
    --master-size m3.medium \
    --topology private \
    --networking kopeio-vxlan \
    production.chroma.fund