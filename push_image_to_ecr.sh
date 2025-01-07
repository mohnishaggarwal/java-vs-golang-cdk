#!/bin/bash

check_ecr_login() {
    if docker system info | grep -q "${repo_uri}"; then
        return 0
    else
        return 1
    fi
}

exit_on_failure() {
  if [ $? -ne 0 ]; then
    exit 1
  fi
}

declare region=""
declare account_id=""
declare image_and_tag=""
declare ecr_repo=""

usage() {
    echo "Usage: $0 --region <region> --account_id <account_id> --image_and_tag <image:tag> --ecr_repo <repo_name>"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --region)
            region="$2"
            shift 2
            ;;
        --account_id)
            account_id="$2"
            shift 2
            ;;
        --image_and_tag)
            image_and_tag="$2"
            shift 2
            ;;
        --ecr_repo)
            ecr_repo="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1"
            usage
            ;;
    esac
done

if [[ -z "$region" || -z "$account_id" || -z "$image_and_tag" || -z "$ecr_repo" ]]; then
    echo "Error: Missing required arguments."
    usage
fi

if [[ $image_and_tag =~ ^[a-zA-Z0-9._/-]+:[a-zA-Z0-9._/-]+$ ]]; then
  echo "The input '$image_and_tag' is in the correct format."
else
  echo "The input '$image_and_tag' is not in the correct format. Please use 'image:tag'."
  exit 1
fi

repo_uri="${account_id}.dkr.ecr.${region}.amazonaws.com"

if check_ecr_login; then
  echo "Already authenticated to ECR"
else
  echo "Authenticating to ECR"
  aws ecr get-login-password --region "${region}" | docker login --username AWS --password-stdin "${repo_uri}"
  exit_on_failure
fi

echo "Tagging local docker image"
ecr_repo_img_location=${repo_uri}/${ecr_repo}:latest
docker tag "${image_and_tag}" "${ecr_repo_img_location}"
exit_on_failure

echo "Pushing docker image to repository"
docker push "${ecr_repo_img_location}"
