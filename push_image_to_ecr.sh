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

read -p "AWS region: " region
read -p "AWS account id: " account_id
read -p "Docker image and tag [image:tag]: " image_and_tag
read -p "AWS ECR repo name: " ecr_repo

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
