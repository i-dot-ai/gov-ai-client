-include .env
export


install:
	cd frontend && npm install

pre-commit-install:
	pre-commit install

run_frontend:
	cd frontend && npm run dev
run:
	docker compose up -d --wait

stop:
	docker compose down

# Docker
REPO_POSTFIX = $(if $(findstring /,$(service)),$(notdir $(service)),$(service))

ECR_REPO_NAME=$(APP_NAME)
ECR_URL=$(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
ECR_REPO_URL=$(ECR_URL)/$(ECR_REPO_NAME)

IMAGE_TAG=$$(git rev-parse HEAD)
IMAGE=$(ECR_REPO_URL):$(IMAGE_TAG)

PUBLIC_ECR_REPO_URL=public.ecr.aws/idotai
PUBLIC_IMAGE=$(PUBLIC_ECR_REPO_URL)/$(ECR_REPO_NAME):$(VERSION)

DOCKER_BUILDER_CONTAINER=$(APP_NAME)
cache ?= ./.build-cache

docker_login:
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_URL)

docker_build: ## Build the docker container for the specified service when running in CI/CD
	DOCKER_BUILDKIT=1 docker buildx build --platform linux/amd64 --load --builder=$(DOCKER_BUILDER_CONTAINER) -t $(IMAGE) \
	--cache-to type=local,dest=$(cache) \
	--cache-from type=local,src=$(cache) -f frontend/Dockerfile .

docker_build_public_image: ## Build the docker container for the specified service when running in CI/CD
	DOCKER_BUILDKIT=1 docker buildx build --platform linux/amd64 --load --builder=$(DOCKER_BUILDER_CONTAINER) -t $(PUBLIC_IMAGE) \
	--cache-to type=local,dest=$(cache) \
	--cache-from type=local,src=$(cache) -f frontend/Dockerfile .

docker_build_local: ## Build the docker container for the specified service locally
	DOCKER_BUILDKIT=1 docker build --platform=linux/amd64 -t $(IMAGE) -f $(service)/Dockerfile .

docker_push:
	docker push $(IMAGE)

docker_push_public_ecr:
	docker push $(PUBLIC_IMAGE)

docker_tag_is_present_on_image:
	aws ecr describe-images --repository-name $(repo) --image-ids imageTag=$(IMAGE_TAG) --query 'imageDetails[].imageTags' | jq -e '.[]|any(. == "$(tag)")' >/dev/null

check_docker_tag_exists:
	if ! make docker_tag_is_present_on_image tag=$(IMAGE_TAG) 2>/dev/null; then \
		echo "Error: ECR tag $(IMAGE_TAG) does not exist." && exit 1; \
	fi

docker_update_tag: ## Tag the docker image with the specified tag
	# repo and tag variable are set from git-hub core workflow. example: repo=ecr-repo-name, tag=dev
	if make docker_tag_is_present_on_image 2>/dev/null; then echo "Image already tagged with $(tag)" && exit 0; fi && \
	MANIFEST=$$(aws ecr batch-get-image --repository-name $(repo) --image-ids imageTag=$(IMAGE_TAG) --query 'images[].imageManifest' --output text) && \
	aws ecr put-image --repository-name $(repo) --image-tag $(tag) --image-manifest "$$MANIFEST"

docker_echo:
	echo $($(value))

## Terraform 

ifndef env
override env = default
endif
workspace = $(env)
tf_build_args =-var "image_tag=$(IMAGE_TAG)" -var-file=$(CONFIG_DIR)/${env}-input-params.tfvars

#TF_BACKEND_CONFIG=backend.hcl
CONFIG_DIR=../../gov-ai-client-infra-config
TF_BACKEND_CONFIG=$(CONFIG_DIR)/backend.hcl


AUTO_APPLY_RESOURCES = module.frontend.aws_ecs_service.aws-ecs-service \
  					   module.frontend.data.aws_ecs_task_definition.main \
					   module.frontend.aws_ecs_task_definition.task_definition \
					   module.backend.aws_ecs_service.aws-ecs-service \
					   module.backend.data.aws_ecs_task_definition.main \
					   module.backend.aws_ecs_task_definition.task_definition \
                       module.load_balancer.aws_security_group_rule.load_balancer_http_whitelist \
					   module.load_balancer.aws_security_group_rule.load_balancer_https_whitelist \
					   module.waf.aws_wafv2_ip_set.host_ip_whitelist


auto_apply_target_resources = $(foreach resource,$(AUTO_APPLY_RESOURCES),-target $(resource))

tf_set_workspace:
	terraform -chdir=terraform/ workspace select $(workspace)

tf_new_workspace:
	terraform -chdir=terraform/ workspace new $(workspace)

tf_set_or_create_workspace:
	make tf_set_workspace || make tf_new_workspace

tf_init_and_set_workspace:
	make tf_init && make tf_set_or_create_workspace

.PHONY: tf_init
tf_init:
	terraform -chdir=./terraform/ init \
		-backend-config=$(TF_BACKEND_CONFIG) \
		-backend-config="dynamodb_table=i-dot-ai-$(env)-dynamo-lock" \
		-reconfigure

.PHONY: tf_fmt
tf_fmt:
	terraform fmt

.PHONY: tf_plan
tf_plan:
	make tf_init_and_set_workspace && \
	terraform -chdir=./terraform/ plan ${tf_build_args} ${args}

.PHONY: tf_apply
tf_apply:
	make tf_init_and_set_workspace && \
	terraform -chdir=./terraform/ apply ${tf_build_args} ${args}

.PHONY: tf_auto_apply
tf_auto_apply:  ## Auto apply terraform
	make check_docker_tag_exists repo=$(ECR_REPO_NAME)
	make tf_init_and_set_workspace && \
	terraform -chdir=./terraform/ apply  ${tf_build_args} $(auto_apply_target_resources) ${args} -auto-approve

## Release app
.PHONY: release
release: 
	chmod +x ./release.sh && ./release.sh $(env)


