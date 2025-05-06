[![build](https://github.com/i-dot-ai/gov-ai-client/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/i-dot-ai/gov-ai-client/actions/workflows/build.yml?query=branch%3Amain)

# gov-ai-client

A thin chat client for connecting to MCP Servers


## Local development

To run the frontend application, use the following command:

```bash
make run_frontend
```


## MCP configuration

Please copy the `.mcp-servers-example.yaml` file to `.mcp-servers.yaml`

By default the app is configured to talk to a local MCP test server.

For this to work, you'll need to run the server yourself:

```bash
cd mcp-server-demo
npm install
npm run start
```

If the correct values are set in `.mcp-servers.yaml`, the app will also attempt to connect to
a Caddy MCP server at that URL.

Additional MCP servers can be added to this file.

An `MCP_SERVERS` env var can also be set that overrides the yaml file. See `.env.example` for an example of this.



## Frontend

The Frontend uses [Astro](https://astro.build/) and [Lit](https://lit.dev/). There is a readme specific to Astro in the frontend directory.

The app is designed to work without JavaScript (for progressive enhancement), with JavaScript added to provide enhancements such as streaming.


## Tests

End-to-end tests using [Playwright](https://playwright.dev/) are located in the `/tests` directory.

Ensure the main frontend and the demo MCP server are running. Then from the `/tests` directory, run: 

```bash
    npm install
    npx playwright test
```



## Deployment

Your application should be available at the following addresses in the different environments:
- Dev - `https://gov-ai-client-dev.ai.cabinetoffice.gov.uk`
- Preprod - `https://gov-ai-client-preprod.ai.cabinetoffice.gov.uk`
- Prod - `https://gov-ai-client.ai.cabinetoffice.gov.uk`


### CI/CD

#### Builds

The docker images for the services will be built on every push to any branch by the github actions.

#### Releases

The first release to any environment will have to be done manually - contact an admin to make this happen. The admin will need to follow the following process:

- Deploy the `ECR` manually using the `core-infra` repo's `universal` instance.
- Deploy the project specific infra using the `tf_apply` command for `dev`, `preprod`, and `prod`.
- [Add](https://github.com/i-dot-ai/i-ai-core-infrastructure/blob/main/instances/platform/github_roles.tf#L4-L18) project to `github_deploy_roles` for each environment.

Subsequent releases will be done automatically by the GitHub actions. They are triggered by:

- Running `make release env=<env>` to release any commit to `dev` or `preprod`.
- Pushing to main will release to `prod`.

#### Notifications

The CI/CD pipeline is configured to send Slack notifications when a deployment to a given environment occurs. This process uses the `SLACK_WEBHOOK_URL` GitHub secret to post the message to Slack. By default, a repo will use the GitHub secret located at the organisation level to post the message to the `#platform-release-notifications-test` channel. 

To override this behaviour so the message posts to a channel of your choosing, follow these instructions:
- Proceed to the [GitHub Notification](https://api.slack.com/apps/A07CA1KSF8Q/incoming-webhooks) Slack app webhooks page and select "add new webhook to workspace"
- On the next page, select the Slack channel you want to add the webhook to and click "Allow".
- Copy the webhook link provided and add this as a GitHub Actions secret in the repository of choice. Slack notifications for this repo will now be directed to this channel.

#### Slack Notifications for CloudWatch Alarms

The CI/CD pipeline is set up to send notifications to specific Slack channels when CloudWatch Alarms are triggered. Notifications will be sent to environment-specific channels as follows:

- **Prod**: `#application-alerts`
- **Preprod**: `#application-alerts-preprod`
- **Dev**: `#application-alerts-dev`

#### Customizing Notification Channels

If you need to change the default channel for notifications, follow these steps:

1. Go to the [GitHub Notification](https://api.slack.com/apps/A07JPB123B8/incoming-webhooks) Slack app webhooks page and select **"Add new webhook to workspace."**
2. On the next screen, choose the Slack channel where you want the notifications to be sent and click **"Allow."**
3. Copy the provided webhook URL and update the `slack_webhook` variable in your Terraform configuration.

### Sentry setup

To set up sentry, login to our organisation account at [sentry.io](sentry.io).

- Navigate to the `projects` page
- Click `Create project`
- Select `FASTAPI` as project type
- Click create
- On the following page, in the `Configure SDK`, copy the value for `dsn=` **KEEP THIS SECRET**
- Navigate to the SSM parameter store entry for your deployed application
- Replace `SENTRY_DSN` value with the value you copied


### Environment Variables

#### Non-sensitive

For non-secret environment variables, they can be passed into the applications in plain-text and passed into the environment variables argument of the relevant service in `terraform/ecs.tf`.

#### Sensitive

For sensitive environment variables, an SSM Parameter Store parameter can be created for each secret required by your application. 

The parameters are stored as encrypted secure strings with SSM Parameter Store, and match the following shape:
`/i-dot-ai-<env>-<app-name>/env_secrets/<variable-name>`

These secrets can be created or removed as required by updating `terraform/secrets.tf`. Secret values must not be hardcoded here - they should either be set as references, or deployed with a placeholder value and subsequently updated in SSM.

Any secrets defined here will be read from SSM securely and loaded into the container on initialisation. From this point onwards, they are accessible as any other environment variable as `<variable-name>`.

Secrets can be updated in SSM by navigating to SSM Parameter Store in the AWS console, finding the desired variable, and editing the value. Production variables cannot be viewed by non-admins for security reasons, but can still be set by calling PutParameter using the AWS CLI, replacing `name` and `value` as appropriate:
```aws ssm put-parameter \
    --name "/i-dot-ai-<env>-<app-name>/env_secrets/<variable-name>" \
    --value "<new-value>" \
    --type "SecureString" \
    --overwrite
```


### Debugging

#### Getting to the logs

To get the logs of your apps for any issues, you can do the following:

- Login to the AWS Console
- Navigate to ECS
- Select Clusters
- Select your cluster: `i-dot-ai-<env>-cluster`

- Select your service: `i-dot-ai-<env>-gov-ai-client-<frontend/backend>-service`

- Select the logs tab (you can also click view in cloudwatch for a more details breakdown)

#### Getting into the container

To get into the running container, you need to:

- Get to the service in the AWS console, the last step in [getting to the logs](#getting-to-the-logs).
- Select a running task
- Get the ARN of the task, it's within the Task overview section of the task Configuration tab.
- Execute the command below (ensuring you are authenticated with AWS):
```
aws ecs execute-command \
    --cluster i-dot-ai-<env>-cluster \
    --task <TASK_ARN> \
    --interactive \
    --command "/bin/sh"
```
> Note: You will only have permissions to do this on tasks in dev or preprod environments.

#### Diagrams Module Dependency

The `diagrams` module is used in the `gov-ai-client/terraform/diagram_script.py` file. To generate the `diagrams`, follow the instructions below:

``` bash
make generate_aws_diagram
```

